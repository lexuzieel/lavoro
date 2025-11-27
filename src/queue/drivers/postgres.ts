import { Job, Payload } from '../contracts/job.js'
import {
  QueueDriver,
  QueueDriverStopOptions,
  QueueName,
} from '../contracts/queue_driver.js'
import {
  PostgresQueueConnectionConfig,
  QueueConfig,
  WorkerOptions,
} from '../types.js'

import { Lock, LockFactory } from '@verrou/core'
import { knexStore } from '@verrou/core/drivers/knex'
import type { SerializedLock } from '@verrou/core/types'
import knex from 'knex'
import { PgBoss } from 'pg-boss'

export type PostgresConfig = {
  host: string
  port: string | number
  user: string
  password: string
  database: string
}

export class PostgresQueueDriver extends QueueDriver {
  private boss: PgBoss
  private postgresConfig: PostgresQueueConnectionConfig['config']
  private lockFactory?: LockFactory
  private lockKnexInstance?: ReturnType<typeof knex>
  private lockTableName: string = 'lavoro_locks'

  constructor(
    queueConfig: QueueConfig,
    options: Record<QueueName, WorkerOptions>,
    config: PostgresQueueConnectionConfig['config'],
  ) {
    super(queueConfig, options)

    this.postgresConfig = config

    this.boss = new PgBoss({
      connectionString: `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
    })
  }

  public createLockProvider() {
    const knexInstance = knex({
      client: 'pg',
      connection: {
        host: this.postgresConfig.host,
        port: Number(this.postgresConfig.port),
        user: this.postgresConfig.user,
        password: this.postgresConfig.password,
        database: this.postgresConfig.database,
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
        for (const job of jobs) {
          const { queue, name } = Job.parseName(job.name)

          if (!queue || !name) {
            this.logger.warn({ name: job.name }, 'Invalid job class name')
            continue // skip this job, since it is impossible to process it
          }

          this.logger.trace({ job: name }, 'Processing job')

          try {
            this.checkIfJobIsRegistered(name)
          } catch (error) {
            this.logger.warn(error.message)

            await this.boss.fail(job.name, job.id, error)

            continue // fail this run attempt and continue with the next job
          }

          const jobClass = this.registeredJobs.get(name)

          if (jobClass) {
            const jobInstance = new jobClass()

            jobInstance.connection = this.connection
            jobInstance.queue = queue
            jobInstance.id = job.id

            // TODO: Make this pretty

            // Extract lock data from payload if present (scheduled jobs)
            const serializedLock = (job.data as any)?._lock as
              | SerializedLock
              | undefined

            this.logger.debug(
              {
                connection: this.connection,
                queue,
                job: name,
                id: job.id,
                hasLock: !!serializedLock,
              },
              'Processing job',
            )

            // Handle lock for scheduled jobs
            let restoredLock: Lock | undefined

            if (
              serializedLock !== undefined &&
              this.lockFactory !== undefined
            ) {
              try {
                restoredLock = this.lockFactory.restoreLock(serializedLock)
                // await restoredLock.acquire()
                console.log({
                  'acquired in job': await restoredLock.acquireImmediately(),
                  lock: restoredLock.serialize(),
                })
                this.logger.trace(
                  { job: name, id: job.id, lock: serializedLock },
                  'Restored lock from scheduler',
                )
              } catch (error) {
                this.logger.warn(
                  { job: name, id: job.id, error },
                  'Failed to restore lock',
                )
              }
            }

            try {
              await jobInstance.handle(job.data)
            } finally {
              // Release the lock after job completes
              if (restoredLock) {
                try {
                  await restoredLock.forceRelease()
                  this.logger.trace(
                    { job: name, id: job.id, lock: restoredLock.serialize() },
                    'Released lock for scheduled job',
                  )
                } catch (error) {
                  this.logger.warn(
                    { job: name, id: job.id, error },
                    'Failed to release lock',
                  )
                }
              }
            }

            this.logger.trace(
              {
                connection: this.connection,
                queue,
                job: name,
                id: job.id,
              },
              'Job completed',
            )
          }
        }
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
