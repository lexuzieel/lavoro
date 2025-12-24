import {
  ConfiguredDriver,
  Job,
  Payload,
  QueueConfig,
  QueueDriver,
  QueueDriverConfig,
  QueueDriverStopOptions,
  QueueName,
  WorkerOptions,
} from '@lavoro/core'
import { Lock, LockFactory } from '@verrou/core'
import { memoryStore } from '@verrou/core/drivers/memory'
import { SerializedLock } from '@verrou/core/types'
import * as fastq from 'fastq'
import type { queueAsPromised } from 'fastq'

type MemoryQueueDriverState = {
  isPausing: boolean
  isStarted: boolean
  runningJobCount: number
}

export class MemoryQueueDriver extends QueueDriver {
  protected queues = new Map<string, queueAsPromised>()

  protected state: MemoryQueueDriverState = {
    isPausing: false,
    isStarted: false,
    runningJobCount: 0,
  }

  constructor(
    queueConfig: QueueConfig,
    options: Record<string, WorkerOptions>,
    config: QueueDriverConfig = {},
  ) {
    super(queueConfig, options, config)
  }

  public createLockProvider() {
    this.lockFactory = new LockFactory(memoryStore().factory())
    return this.lockFactory
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

    if (!this.config?.worker || concurrency === 0) {
      this.logger.trace(
        { connection: this.connection, queue, job: name },
        'Queue worker is disabled - skipping',
      )

      return
    }

    if (!this.queues.has(fullyQualifiedJobName)) {
      const q: queueAsPromised<any> = fastq.promise(
        this,
        this.runJob,
        concurrency,
      )

      q.pause()

      this.queues.set(fullyQualifiedJobName, q)
    }

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

  private async runJob(data: any): Promise<void> {
    this.state.runningJobCount++

    try {
      await this.processJob(data)
    } catch (error) {
      this.logger.error(
        {
          connection: this.connection,
          job: data.job?.name,
          id: data.job?.id,
          err: error,
        },
        'Job execution failed',
      )
      throw error
    } finally {
      this.state.runningJobCount--
    }
  }

  private async processJob(data: any): Promise<void> {
    const { job, payload }: { job: Job; payload: any } = data

    const { queue, name } = Job.parseName(job.fullyQualifiedName)

    if (!queue || !name) {
      const error = new Error(`Invalid job class name: ${job.name}`)
      this.logger.warn(error)
      throw error
    }

    this.logger.trace({ job: name }, 'Processing job')

    try {
      this.checkIfJobIsRegistered(name)
    } catch (error) {
      this.logger.warn(error.message)
      throw error
    }

    const jobClass = this.registeredJobs.get(name)

    if (!jobClass) {
      const error = new Error(`Job is not registered: ${name}`)
      this.logger.warn(error)
      throw error
    }

    const jobInstance = new jobClass()

    jobInstance.connection = this.connection
    jobInstance.queue = queue
    jobInstance.id = job.id

    // TODO: Make this pretty

    this.logger.debug(
      {
        connection: this.connection,
        queue,
        job: name,
        id: job.id,
      },
      'Processing job',
    )

    /**
     * A job might have been scheduled by the scheduler,
     * in which case we need to restore the lock from the payload.
     *
     * This will prevent the job from being scheduled
     * while it is being processed.
     */
    const serializedLock = payload?._lock as SerializedLock | undefined

    let lock: Lock | undefined

    if (serializedLock !== undefined && this.lockFactory !== undefined) {
      try {
        lock = this.lockFactory.restoreLock(serializedLock)
        await lock.acquireImmediately()

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

    /**
     * Next, we process the actual job.
     */
    try {
      await jobInstance.handle(payload)
    } finally {
      /**
       * If we previously acquired a lock for
       * this job, we need to release it here.
       */
      if (lock) {
        try {
          await lock.forceRelease()

          this.logger.trace(
            { job: name, id: job.id, lock: lock.serialize() },
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
    await super.start()

    this.state.isPausing = false
    this.state.isStarted = true

    for (const queue of this.queues.values()) {
      queue.resume()
    }

    this.logger.trace(
      { connection: this.connection, driver: 'memory' },
      'Queue driver started',
    )
  }

  private async waitForQueues(
    queues: fastq.queueAsPromised[],
    timeout: number,
  ) {
    /**
     * Mark the queue as pausing so it will not
     * accept any new jobs once signaled to stop.
     */
    this.state.isPausing = true

    for (const queue of queues) {
      queue.pause()
    }

    const waitForIdleState = async () => {
      while (this.state.runningJobCount > 0) {
        await new Promise((r) => setTimeout(r, 100))
      }
    }

    await Promise.race([
      waitForIdleState(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Graceful shutdown timeout reached')),
          timeout,
        ),
      ),
    ])
  }

  public async stop(options?: QueueDriverStopOptions): Promise<void> {
    const { graceful = true, timeout = 30000 } = options || {}

    this.logger.trace(
      { connection: this.connection, driver: 'memory', graceful, timeout },
      `Waiting for fastq to stop...`,
    )

    const queues = Array.from(this.queues.values())

    if (graceful) {
      await this.waitForQueues(queues, timeout)
    }

    for (const queue of queues) {
      queue.pause()
      queue.kill()
    }

    this.queues.clear()

    this.state = {
      isStarted: false,
      isPausing: false,
      runningJobCount: 0,
    }

    this.logger.trace(
      { connection: this.connection, driver: 'memory' },
      'Fastq stopped',
    )

    await super.stop()

    this.logger.trace(
      { connection: this.connection, driver: 'memory' },
      'Queue driver stopped',
    )
  }

  public async enqueue<T extends Job, P extends Payload<T>>(
    job: T,
    payload: P,
  ): Promise<void> {
    if (!this.state.isStarted) {
      throw new Error('Queue driver is not started')
    }

    if (this.state.isPausing) {
      throw new Error(
        'Queue driver is shutting down and cannot accept new jobs',
      )
    }

    await super.enqueue(job, payload)

    this.logger.trace(
      {
        connection: this.connection,
        queue: job.options.queue,
        job: job.name,
      },
      'Enqueuing job',
    )

    const q = this.queues.get(job.fullyQualifiedName)

    if (!q) {
      throw new Error(`No worker found for job: ${job.fullyQualifiedName}`)
    }

    q.push({ job, payload }).catch((error) => {
      this.logger.error(
        {
          connection: this.connection,
          queue: job.options.queue,
          job: job.name,
          err: error,
        },
        'Failed to enqueue job',
      )
    })
  }
}

/**
 * In-memory queue driver with no persistence
 * and distributed locking capabilities.
 */
export function memory(
  config?: QueueDriverConfig,
): ConfiguredDriver<MemoryQueueDriver, QueueDriverConfig> {
  return {
    constructor: MemoryQueueDriver,
    config: config,
  }
}
