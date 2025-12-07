import { Logger, createDefaultLogger } from '../../logger.js'
import { QueueConfig, QueueConnectionName, WorkerOptions } from '../types.js'
import { Job, Payload } from './job.js'

import type { LockFactory } from '@verrou/core'

/**
 * Interface to be augmented by users to define their queue names.
 * This enables type-safe queue names throughout the application.
 *
 * Queue names should be defined in config/queue.ts within each connection:
 *
 * @example
 * ```ts
 * // config/queue.ts
 * const queueConfig = defineConfig({
 *   connection: 'main',
 *   connections: {
 *     main: {
 *       driver: 'memory',
 *       queues: {
 *         default: { concurrency: 1 },
 *         emails: { concurrency: 3 },
 *       },
 *     },
 *     background: {
 *       driver: 'postgres',
 *       queues: {
 *         'heavy-tasks': { concurrency: 2 },
 *         reports: { concurrency: 1 },
 *       },
 *       config: { ... },
 *     },
 *   },
 * })
 *
 * // Type augmentation happens automatically via InferQueueNames
 * declare module 'lavoro' {
 *   interface QueuesList extends Record<InferQueueNames<typeof queueConfig>, never> {}
 * }
 * ```
 *
 * After defining your queue names, you'll get autocomplete and type checking:
 * ```ts
 * await queue.listen('emails')        // ✓ Valid
 * await queue.listen('heavy-tasks')   // ✓ Valid
 * await queue.listen('invalid')       // ✗ Type error
 *
 * await job.dispatch(payload).onQueue('emails')  // ✓ Valid
 * await job.dispatch(payload).onQueue('typo')    // ✗ Type error
 * ```
 */
export interface QueuesList {}

/**
 * Interface to be augmented by users to map connections to their queue names.
 * This enables connection-specific type-safe queue names.
 */
export interface ConnectionQueuesMap {}

/**
 * Extract queue names from QueuesList.
 * Defaults to string if no queues are defined.
 */
export type QueueName = keyof QueuesList extends never
  ? string
  : keyof QueuesList

/**
 * Extract queue names for a specific connection from ConnectionQueuesMap.
 */
export type QueueNameForConnection<C extends QueueConnectionName> =
  C extends keyof ConnectionQueuesMap ? ConnectionQueuesMap[C] : QueueName

export type QueueDriverStopOptions = {
  /**
   * Whether to wait for the jobs to finish processing before stopping.
   *
   * Default: true
   */
  graceful?: boolean

  /**
   * The timeout in milliseconds to wait for the jobs to finish processing.
   *
   * Default: 30000 (30 seconds)
   */
  timeout?: number
}

export abstract class QueueDriver {
  protected logger: Logger

  protected registeredQueues: Set<string> = new Set()

  protected registeredJobs: Map<string, new () => Job> = new Map()

  protected config: QueueConfig

  protected options: Record<QueueName, WorkerOptions>

  public connection: QueueConnectionName | undefined

  constructor(config: QueueConfig, options: Record<QueueName, WorkerOptions>) {
    this.logger = createDefaultLogger('queue')
    this.config = config
    this.options = options
  }

  public setLogger(logger: Logger): void {
    this.logger = logger
  }

  protected getMergedWorkerOptions(
    queue: QueueName,
    options?: WorkerOptions,
  ): WorkerOptions {
    const base = this.options[queue] || {}
    return { ...base, ...(options || {}) }
  }

  public async listen(
    queue: QueueName,
    options?: WorkerOptions,
  ): Promise<void> {
    if (this.registeredQueues.has(queue as string)) {
      throw new Error(`Queue '${queue as string}' already registered`)
    }

    this.registeredQueues.add(queue as string)

    const workerOptions = this.getMergedWorkerOptions(queue, options)

    this.logger.trace(
      { connection: this.connection, queue, options: workerOptions },
      'Listening queue',
    )
  }

  public async register(job: new () => Job): Promise<void> {
    if (this.registeredJobs.has(job.name)) {
      return
    }

    this.registeredJobs.set(job.name, job)

    this.logger.trace(
      { connection: this.connection, job: job.name },
      'Registered job',
    )
  }

  public async unregister(job: new () => Job): Promise<void> {
    if (!this.registeredJobs.has(job.name)) {
      return
    }

    this.registeredJobs.delete(job.name)

    this.logger.trace(
      { connection: this.connection, job: job.name },
      'Unregistered job',
    )
  }

  public async start(): Promise<void> {
    for (const [queue, options] of Object.entries(this.options)) {
      await this.listen(queue as QueueName, options)
    }
  }

  public async stop(_options?: QueueDriverStopOptions): Promise<void> {
    this.registeredQueues.clear()
    this.registeredJobs.clear()
  }

  protected checkIfQueueIsRegistered(queue: string): void {
    if (!this.registeredQueues.has(queue)) {
      throw new Error(`Queue '${queue}' is not registered.`)
    }
  }

  protected checkIfJobIsRegistered(job: string): void {
    if (!this.registeredJobs.has(job)) {
      throw new Error(`Job '${job}' is not registered.`)
    }
  }

  public getDefaultQueue(): QueueName {
    if (this.registeredQueues.size === 0) {
      throw new Error(
        `No queues registered for connection: ${this.connection}.`,
      )
    }

    return this.registeredQueues.values().next().value as QueueName
  }

  /**
   * Parent method to be extended by the driver.
   * It implements checks for the job and queue being registered.
   */
  public async enqueue<T extends Job, P extends Payload<T>>(
    job: T,
    // @ts-ignore
    payload: P,
  ): Promise<void> {
    if (!job.options.queue) {
      job.options.queue = this.getDefaultQueue()
    }

    this.checkIfQueueIsRegistered(job.options.queue)
    this.checkIfJobIsRegistered(job.name)

    return Promise.resolve()
  }

  /**
   * Create a lock factory instance for this driver.
   *
   * Each driver implementation should return a
   * [Verrou LockFactory instance](https://verrou.dev/docs/quick-setup#lockfactory-api)
   * that matches the driver's backing store.
   *
   * @returns A LockFactory instance
   */
  public abstract createLockProvider(): LockFactory

  /**
   * Clean up resources associated with a lock factory created by this driver.
   * This is called when the queue is stopped to ensure proper resource cleanup.
   *
   * @param lockFactory - The lock factory instance to clean up
   */
  public async destroyLockProvider(_lockFactory: LockFactory): Promise<void> {
    // Default implementation does nothing
    // Drivers that need cleanup (e.g., Postgres with Knex) should override this
  }
}
