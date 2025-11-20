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

  public queue?: Queue

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
            config: {
              host: this.postgresContainer.getHost(),
              port: this.postgresContainer.getPort(),
              user: this.postgresContainer.getUsername(),
              password: this.postgresContainer.getPassword(),
              database: this.postgresContainer.getDatabase(),
            },
          },
          alternative: {
            driver: 'postgres',
            queues: {
              'first-queue': {},
              'second-queue': {},
            },
            config: {
              host: this.postgresContainer.getHost(),
              port: this.postgresContainer.getPort(),
              user: this.postgresContainer.getUsername(),
              password: this.postgresContainer.getPassword(),
              database: this.postgresContainer.getDatabase(),
            },
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
    const queueConfig = defineConfig({
      jobs,
      connection: 'main',
      connections: await this.getConnectionsConfig(driver),
      ...(config || {}),
    })

    this.queue = new Queue({ ...queueConfig, logger: new Logger(logger) })
    Job.setDefaultQueueServiceResolver(() => Promise.resolve(this.queue!))
  }

  async teardownPostgres() {
    if (this.postgresContainer) {
      logger.debug('Stopping PostgreSQL container...')
      await this.postgresContainer.stop()
      logger.debug('PostgreSQL container stopped')
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
      await this.setupQueue(jobs, driver, config)
    })

    afterAll(async () => {
      await this.teardownPostgres()
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
