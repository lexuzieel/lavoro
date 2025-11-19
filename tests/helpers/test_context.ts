import {
  Logger,
  Queue,
  QueueConnectionConfig,
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

  private async getConnectionConfig(
    driver: QueueDriverType,
  ): Promise<QueueConnectionConfig> {
    switch (driver) {
      case 'postgres':
        logger.debug('Starting PostgreSQL container...')

        this.postgresContainer = await new PostgreSqlContainer(
          'postgres:16-alpine',
        ).start()

        logger.debug('PostgreSQL container started')

        return {
          driver: 'postgres',
          queues: {
            default: { work: true },
            'test-queue': { work: true, concurrency: 1 },
            'disabled-queue': { work: false },
          },
          config: {
            host: this.postgresContainer.getHost(),
            port: this.postgresContainer.getPort(),
            user: this.postgresContainer.getUsername(),
            password: this.postgresContainer.getPassword(),
            database: this.postgresContainer.getDatabase(),
          },
        }
      default:
        throw new Error(`Unsupported driver: ${driver}`)
    }
  }

  async setupQueue(jobs: (new () => Job)[] = [], driver: QueueDriverType) {
    const queueConfig = defineConfig({
      jobs,
      connection: 'main',
      connections: {
        main: await this.getConnectionConfig(driver),
      },
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
  setup(jobs: (new () => Job)[] = [], driver: QueueDriverType) {
    beforeAll(async () => {
      await this.setupQueue(jobs, driver)
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
