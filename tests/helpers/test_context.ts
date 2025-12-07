import {
  Logger,
  Queue,
  QueueConfig,
  QueueConnectionConfig,
  QueueConnectionName,
  QueueDriverType,
  Schedule,
} from '../../src/index.js'
import { Job } from '../../src/queue/contracts/job.js'
import { QueueDriverStopOptions } from '../../src/queue/contracts/queue_driver.js'
import { defineConfig } from '../../src/queue/define_config.js'
import { PostgresConfig } from '../../src/queue/drivers/postgres.js'

import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import dotenv from 'dotenv'
import { PgBoss, QueueResult } from 'pg-boss'
import pino from 'pino'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

dotenv.config()

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  level: process.env.LOG_LEVEL || 'trace',
})

const connections = {
  main: {
    queues: {
      default: {},
      'custom-queue': { concurrency: 2 },
      'disabled-queue': { concurrency: 0 },
      'high-throughput': { concurrency: 99 },
    },
  },
  alternative: {
    queues: {
      'first-queue': {},
      'second-queue': {},
    },
  },
} as const

export class TestContext {
  private postgresContainer?: StartedPostgreSqlContainer

  public getPostgres(): StartedPostgreSqlContainer {
    if (!this.postgresContainer) {
      throw new Error('PostgreSQL container not started')
    }

    return this.postgresContainer
  }

  public getPostgresConfig(): PostgresConfig {
    // return {
    //   host: 'localhost',
    //   port: 5432,
    //   user: 'postgres',
    //   password: 'postgres',
    //   database: 'postgres',
    // }

    return {
      host: this.getPostgres().getHost(),
      port: this.getPostgres().getPort(),
      user: this.getPostgres().getUsername(),
      password: this.getPostgres().getPassword(),
      database: this.getPostgres().getDatabase(),
    }
  }

  private queue?: Queue

  public getQueue(): Queue {
    if (!this.queue) {
      throw new Error('Queue has not been initialized')
    }

    return this.queue
  }

  public async getPgBossStats(
    connection: QueueConnectionName,
    queue: string,
    job: new () => Job,
  ): Promise<QueueResult> {
    const driver = (this.getQueue() as any).drivers.get(connection)
    const boss = (driver as any).boss as PgBoss

    return await boss.getQueueStats(Job.compileName(queue, job.name))
  }

  private async getConnectionsConfig(
    driver: QueueDriverType,
  ): Promise<Record<QueueConnectionName, QueueConnectionConfig>> {
    switch (driver) {
      case 'postgres':
        logger.debug('Starting PostgreSQL container...')

        this.postgresContainer = await new PostgreSqlContainer(
          'postgres:16-alpine',
        ).start()

        logger.debug('PostgreSQL container started')

        return {
          main: {
            driver: 'postgres',
            queues: connections.main.queues,
            config: this.getPostgresConfig(),
          },
          alternative: {
            driver: 'postgres',
            queues: connections.alternative.queues,
            config: this.getPostgresConfig(),
          },
        }
      default:
        throw new Error(`Unsupported driver: ${driver}`)
    }
  }

  async setupQueue(
    jobs: (new () => Job)[] = [],
    driver: QueueDriverType,
    config?: Partial<QueueConfig>,
  ) {
    if (this.queue) {
      await this.stopQueue()
    }

    const queueConfig = defineConfig({
      jobs,
      connection: 'main',
      connections: await this.getConnectionsConfig(driver),
      ...(config || {}),
    })

    this.queue = new Queue({ ...queueConfig, logger: new Logger(logger) })
    Job.setDefaultQueueServiceResolver(() => Promise.resolve(this.getQueue()))

    return this.getQueue()
  }

  async teardownPostgres() {
    if (this.postgresContainer) {
      logger.debug('Stopping PostgreSQL container...')
      await this.postgresContainer.stop({
        remove: true,
        removeVolumes: true,
      })
      logger.debug('PostgreSQL container stopped')
    } else {
      logger.debug('PostgreSQL container not started')
    }
  }

  async startQueue() {
    await this.queue?.start()
  }

  async stopQueue(options?: QueueDriverStopOptions) {
    await this.queue?.stop(options)
  }

  /**
   * Setup lifecycle hooks for vitest
   */
  setup(
    jobs: (new () => Job)[] = [],
    driver: QueueDriverType,
    config?: Partial<QueueConfig>,
  ) {
    beforeAll(async () => {
      this.queue = await this.setupQueue(jobs, driver, config)
    }, 60 * 1000)

    afterAll(async () => {
      await this.teardownPostgres()
      this.queue = undefined
    }, 30 * 1000)

    beforeEach(async () => {
      Schedule.clear()
      await this.startQueue()
    })

    afterEach(async () => {
      Schedule.clear()
      await this.stopQueue({ timeout: 30000 })
    }, 30 * 1000)
  }
}

type ConnectionNames = keyof typeof connections
type AllQueueNames = keyof (typeof connections)[ConnectionNames]['queues']
type ConnectionQueuesMapType = {
  [K in ConnectionNames]: keyof (typeof connections)[K]['queues']
}

declare module '../../src/queue/types.js' {
  export interface QueueConnections extends Record<ConnectionNames, never> {}
}

declare module '../../src/queue/contracts/queue_driver.js' {
  export interface QueuesList extends Record<AllQueueNames, never> {}
  export interface ConnectionQueuesMap extends ConnectionQueuesMapType {}
}
