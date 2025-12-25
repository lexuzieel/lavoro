import {
  ConfiguredDriver,
  Job,
  Payload,
  QueueConfig,
  QueueDriver,
  QueueDriverStopOptions,
  QueueName,
  WorkerOptions,
} from '@lavoro/core'
import { LockFactory } from '@verrou/core'
import { knexStore } from '@verrou/core/drivers/knex'
import knex from 'knex'
import { PgBoss, Job as PgBossJob } from 'pg-boss'

export type PostgresConfig = {
  host: string
  port: string | number
  user: string
  password: string
  database: string
}

export class PostgresQueueDriver extends QueueDriver<PostgresConfig> {
  private boss: PgBoss
  private lockKnexInstance?: ReturnType<typeof knex>
  private lockTableName: string = 'lavoro_locks'

  constructor(
    queueConfig: QueueConfig,
    options: Record<string, WorkerOptions>,
    config?: PostgresConfig,
  ) {
    /**
     * Since the config is marked optional and it is required for this driver,
     * we check it during runtime before creating the driver.
     */
    if (!config) {
      throw new Error('PostgresQueueDriver requires a config object')
    }

    super(queueConfig, options, config)

    this.boss = new PgBoss({
      connectionString: `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
    })
  }

  public createLockProvider() {
    const knexInstance = knex({
      client: 'pg',
      connection: {
        host: this.driverConfig.host,
        port: Number(this.driverConfig.port),
        user: this.driverConfig.user,
        password: this.driverConfig.password,
        database: this.driverConfig.database,
      },
    })

    this.lockKnexInstance = knexInstance

    this.lockFactory = new LockFactory(
      knexStore({
        connection: this.lockKnexInstance,
        autoCreateTable: true,
        tableName: this.lockTableName,
      }).factory(),
    )

    return this.lockFactory
  }

  public async destroyLockProvider(): Promise<void> {
    if (this.lockKnexInstance) {
      await this.lockKnexInstance.destroy()
      this.lockKnexInstance = undefined
    }
  }

  /**
   *
   * @param fullyQualifiedJobName
   */
  private async createWorker(
    fullyQualifiedJobName: string,
    options: WorkerOptions,
  ): Promise<void> {
    const { concurrency = 1 } = options

    const { queue, name } = Job.parseName(fullyQualifiedJobName)

    await this.boss.createQueue(fullyQualifiedJobName, {
      // partition: true,
      // deadLetter: undefined,
      // retryLimit: 3,
      // retryDelay: 1,
      // retryBackoff: true,
      // retentionSeconds: 0, // Default: 14 days. How many seconds a job may be in created or retry state before it's deleted.
      // deleteAfterSeconds: 0, // Default: 7 days. How long a job should be retained in the database after it's completed.
    })

    if (!this.config?.worker || concurrency === 0) {
      this.logger.trace(
        { connection: this.connection, queue, job: name },
        'Queue worker is disabled - skipping',
      )

      return
    }

    await this.boss.work(
      fullyQualifiedJobName,
      {
        batchSize: concurrency,
        // pollingIntervalSeconds: 2, // 2 seconds by default
      },
      async (jobs) => {
        Promise.allSettled(
          jobs.map(async (job) => {
            try {
              await this.processJob(job)
            } catch (error) {
              this.logger.warn(
                {
                  connection: this.connection,
                  queue,
                  job: job.name,
                  err: error,
                },
                'Got error while processing the job',
              )

              this.emit('error', error)

              await this.boss.fail(job.name, job.id, error)
            }
          }),
        )
      },
    )

    this.logger.trace(
      {
        connection: this.connection,
        queue,
        job: name,
        options,
      },
      'Started worker',
    )
  }

  private async processJob(job: PgBossJob<unknown>): Promise<void> {
    await this.process({
      id: job.id,
      fullyQualifiedName: job.name,
      payload: job.data,
    })
  }

  public async listen(
    queue: QueueName,
    options?: WorkerOptions,
  ): Promise<void> {
    const mergedOptions = this.getMergedWorkerOptions(queue, options)
    await super.listen(queue, options)
    for (const job of this.registeredJobs.values()) {
      await this.createWorker(Job.compileName(queue, job.name), mergedOptions)
    }
  }

  public async start(): Promise<void> {
    // TODO: Add error handling
    this.boss.on('error', async (error) => {
      this.logger.error({ error }, 'Error in Postgres queue driver')
      await this.stop({ graceful: false })
    })

    await this.boss.start()

    await super.start()

    this.logger.trace(
      { connection: this.connection, driver: 'postgres' },
      'Queue driver started',
    )
  }

  public async stop(options?: QueueDriverStopOptions): Promise<void> {
    const { graceful = true, timeout = 30000 } = options || {}

    this.logger.trace(
      { connection: this.connection, driver: 'postgres', graceful, timeout },
      `Waiting for pg-boss to stop...`,
    )

    await this.boss.stop({ graceful, timeout })

    this.logger.trace(
      { connection: this.connection, driver: 'postgres' },
      'Pg-boss stopped',
    )

    await super.stop()

    this.logger.trace(
      { connection: this.connection, driver: 'postgres' },
      'Queue driver stopped',
    )
  }

  public async enqueue<T extends Job, P extends Payload<T>>(
    job: T,
    payload: P,
  ): Promise<void> {
    await super.enqueue(job, payload)

    this.logger.trace(
      {
        connection: this.connection,
        queue: job.options.queue,
        job: job.name,
      },
      'Enqueuing job',
    )

    await this.boss.send(job.fullyQualifiedName, payload as object, {
      // priority: 2,
      // retryLimit: 3,
      // startAfter: 10,
    })
  }

  // public async schedule<T extends Job, P extends Payload<T>>(
  //   job: T,
  //   payload: P,
  // ): Promise<void> {
  //   await super.schedule(job, payload)

  //   this.logger.trace(
  //     { connection: this.connection, queue: job.options.queue, job: job.name },
  //     'Scheduling job',
  //   )

  //   const scheduleExpression = job.options.schedule || '* * * * *' // every second

  //   await this.boss.schedule(
  //     job.fullyQualifiedName,
  //     scheduleExpression,
  //     payload as object,
  //     {
  //       // tz: 'UTC',
  //       // key: 'unique_key',
  //     },
  //   )
  // }
}

/**
 * Builder function for PostgresQueueDriver.
 * Creates a driver descriptor with type-safe config.
 */
export function postgres(
  config: PostgresConfig,
): ConfiguredDriver<PostgresQueueDriver, PostgresConfig> {
  return {
    constructor: PostgresQueueDriver,
    config: config,
  }
}
