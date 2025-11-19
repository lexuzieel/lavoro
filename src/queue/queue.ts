import { Logger, createDefaultLogger } from '../logger.js'
import { Job, Payload } from './contracts/job.js'
import { QueueDriver } from './contracts/queue_driver.js'
import { MemoryQueueDriver } from './drivers/memory.js'
import { PostgresQueueDriver } from './drivers/postgres.js'
import type {
  QueueConfig,
  QueueConnectionConfig,
  QueueConnectionName,
} from './types.js'

export class Queue {
  private drivers: Map<QueueConnectionName, QueueDriver> = new Map()
  private started: boolean = false
  private logger: Logger

  constructor(private config: QueueConfig & { logger?: Logger }) {
    this.logger = config?.logger || createDefaultLogger('queue')

    for (const [connection, driverConfig] of Object.entries(
      this.config.connections,
    )) {
      this.logger.trace(
        { connection, driver: driverConfig.driver },
        'Creating queue driver',
      )

      const driver = this.createDriver(driverConfig)
      driver.connection = connection as QueueConnectionName

      this.drivers.set(driver.connection, driver)
    }
  }

  private createDriver(config: QueueConnectionConfig): QueueDriver {
    let driver: QueueDriver

    switch (config.driver) {
      case 'memory':
        driver = new MemoryQueueDriver(config.queues)
        break
      case 'postgres':
        driver = new PostgresQueueDriver(config.config, config.queues)
        break
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = config
        throw new Error(`Invalid queue driver: ${(_exhaustive as any).driver}.`)
    }

    driver.setLogger(this.logger)

    return driver
  }

  async start() {
    if (this.started) {
      this.logger.warn('Queue service already started')
      return
    }

    for (const job of this.config.jobs) {
      await this.register(job)
    }

    this.started = true

    for (const [connection, driver] of this.drivers) {
      this.logger.trace({ connection }, 'Starting queue connection')
      await driver.start()
    }

    this.logger.trace(
      { connections: Array.from(this.drivers.keys()) },
      'Queue service started',
    )
  }

  async stop() {
    if (!this.started) {
      this.logger.warn('Queue service not started')
      return
    }

    for (const job of this.config.jobs) {
      await this.unregister(job)
    }

    this.started = false

    for (const [connection, driver] of this.drivers) {
      this.logger.trace({ connection }, 'Stopping queue connection')
      await driver.stop()
    }

    this.logger.trace('Queue service stopped')
  }

  protected async register(job: new () => Job): Promise<void> {
    for (const [_, driver] of this.drivers) {
      await driver.register(job)
    }
  }

  protected async unregister(job: new () => Job): Promise<void> {
    for (const [_, driver] of this.drivers) {
      await driver.unregister(job)
    }
  }

  public async enqueue<T extends Job, P extends Payload<T>>(
    job: T,
    payload: P,
  ): Promise<void> {
    if (this.drivers.size === 0) {
      throw new Error('No queue drivers available.')
    }

    /**
     * Try to get driver from connection if specified
     * otherwise use the first available driver.
     */
    const driver: QueueDriver | undefined = job.options.connection
      ? this.drivers.get(job.options.connection)
      : this.drivers.values().next().value

    if (!driver) {
      throw new Error(
        `No driver found for connection: ${job.options.connection}.`,
      )
    }

    if (!job.options.queue) {
      job.options.queue = driver.getDefaultQueue()
    }

    await driver.enqueue(job, payload)
  }
}
