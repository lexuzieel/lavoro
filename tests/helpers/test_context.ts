import {
  Logger,
  Queue,
  QueueConfig,
  QueueConnectionConfig,
  QueueConnectionName,
  QueueDriverType,
} from '../../src/index.js'
import { Job } from '../../src/queue/contracts/job.js'
import { defineConfig } from '../../src/queue/define_config.js'
import { PostgresConfig } from '../../src/queue/drivers/postgres.js'

import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import dotenv from 'dotenv'
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

export class TestContext {
  private postgresContainer?: StartedPostgreSqlContainer

  public getPostgres(): StartedPostgreSqlContainer {
    if (!this.postgresContainer) {
      throw new Error('PostgreSQL container not started')
    }

    return this.postgresContainer
  }

  public getPostgresConfig(): PostgresConfig {
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
            queues: {
              default: {},
              'custom-queue': { concurrency: 2 },
              'disabled-queue': { concurrency: 0 },
            },
            config: this.getPostgresConfig(),
          },
          alternative: {
            driver: 'postgres',
            queues: {
              'first-queue': {},
              'second-queue': {},
            },
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

  async stopQueue() {
    await this.queue?.stop()
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
    })

    afterAll(async () => {
      await this.teardownPostgres()
      this.queue = undefined
    })

    beforeEach(async () => {
      await this.startQueue()
    })

    afterEach(async () => {
      await this.stopQueue()
    })
  }
}

declare module '../../src/queue/types.js' {
  export interface QueueConnections {
    main: never
    alternative: never
  }
}

declare module '../../src/queue/contracts/queue_driver.js' {
  export interface QueuesList
    extends Record<'default' | 'custom-queue' | 'disabled-queue', never> {}

  export interface ConnectionQueuesMap {
    main: 'default' | 'custom-queue' | 'disabled-queue'
    alternative: 'first-queue' | 'second-queue'
  }
}
