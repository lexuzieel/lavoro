import { Job, Payload, PayloadWithLock } from '../queue/contracts/job.js'
import { QueueNameForConnection } from '../queue/contracts/queue_driver.js'
import { PendingDispatch } from '../queue/pending_dispatch.js'
import { DefaultConnection, QueueConnectionName } from '../queue/types.js'
import { PendingSchedule } from './pending_schedule.js'

import type { LockFactory } from '@lavoro/verrou'
import type { SerializedLock } from '@lavoro/verrou/types'

export class PendingJobSchedule<
  T extends Job,
  P extends Payload<T>,
  C extends QueueConnectionName = DefaultConnection extends { name: infer N }
    ? N extends QueueConnectionName
      ? N
      : QueueConnectionName
    : QueueConnectionName,
> extends PendingSchedule {
  /**
   * Use composition pattern and store pending
   * job dispatch inside a pending schedule.
   */
  protected dispatch: PendingDispatch<T, PayloadWithLock<T, P>, C>

  private _connection?: string
  private _queue?: string

  private get jobName(): string {
    return `${this._connection}_${this._queue}_${this.job.name}`
  }

  constructor(
    protected job: T,
    protected payload: PayloadWithLock<T, P>,
    protected lockProviderResolver: () => LockFactory,
  ) {
    super(
      job.name,
      async (serializedLock?: SerializedLock) => {
        // Pass the serialized lock to the payload.
        if (serializedLock) {
          this.payload._lock = serializedLock
        }

        await this.dispatch.then(undefined, (error) => {
          throw error
        })
      },
      lockProviderResolver,
    )

    this.job = job
    this.payload = payload
    this.dispatch = new PendingDispatch(job, payload)

    this.distributedLockOptions.handOff = true
  }

  public onConnection<NewC extends QueueConnectionName>(
    connection: NewC,
  ): PendingJobSchedule<T, P, NewC> {
    this._connection = connection
    this.dispatch.onConnection(connection)
    // TypeScript can't track type parameter changes through `this`.
    // The instance is the same, but the type parameter C changes to NewC,
    // so we need to assert the type to the new type.
    return this as unknown as PendingJobSchedule<T, P, NewC>
  }

  public onQueue(queue: QueueNameForConnection<C>): this {
    this._queue = queue
    this.dispatch.onQueue(queue)

    return this
  }

  // public withQueueServiceResolver(queueServiceResolver: () => Promise<Queue>) {
  //   this.dispatch.withQueueServiceResolver(queueServiceResolver)
  //   return this
  // }

  protected async execute(): Promise<void> {
    // Before executing, update the lock provider resolver to use the one from the queue connection
    const queueServiceResolver = this.job.getQueueServiceResolver
    if (queueServiceResolver) {
      const queue = await queueServiceResolver()

      // Get the connection the job will use
      const connection =
        this.job.options.connection ?? queue.getDefaultConnection()

      // Override the lock service resolver to use the connection's lock provider
      const connectionLockService = queue.getLockProvider(connection)

      if (connectionLockService) {
        this.lockProviderResolver = () => connectionLockService
      }

      // Register this scheduled job with the queue service
      if (this.job.id) {
        queue.registerScheduledJob(this.job.id)
      }

      this._connection = this._connection ?? queue.getDefaultConnection()
      this._queue = this._queue ?? queue.getDefaultQueue()
    }

    this.name = this.jobName

    await super.execute()
  }
}
