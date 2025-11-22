import { Job, Payload } from '../queue/contracts/job.js'
import { QueueNameForConnection } from '../queue/contracts/queue_driver.js'
import { PendingDispatch } from '../queue/pending_dispatch.js'
import { DefaultConnection, QueueConnectionName } from '../queue/types.js'
import { PendingSchedule } from './pending_schedule.js'

import { Verrou } from '@verrou/core'

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
  protected dispatch: PendingDispatch<T, P, C>

  constructor(
    protected job: T,
    protected payload: P,
    protected verrou: Verrou<any>,
  ) {
    super(
      job.id,
      async () => {
        await this.dispatch.then(undefined, (error) => {
          throw error
        })
      },
      verrou,
    )
    this.job = job
    this.payload = payload
    this.dispatch = new PendingDispatch(job, payload)
  }

  public onConnection<NewC extends QueueConnectionName>(
    connection: NewC,
  ): PendingJobSchedule<T, P, NewC> {
    this.dispatch.onConnection(connection)
    // TypeScript can't track type parameter changes through `this`.
    // The instance is the same, but the type parameter C changes to NewC,
    // so we need to assert the type to the new type.
    return this as unknown as PendingJobSchedule<T, P, NewC>
  }

  public onQueue(queue: QueueNameForConnection<C>): this {
    this.dispatch.onQueue(queue)

    return this
  }

  // public withQueueServiceResolver(queueServiceResolver: () => Promise<Queue>) {
  //   this.dispatch.withQueueServiceResolver(queueServiceResolver)
  //   return this
  // }

  protected async execute(): Promise<void> {
    await super.execute()

    // Register this scheduled job with the queue service
    // instance so it will be cleared up on queue stop.
    const queueServiceResolver = this.job.getQueueServiceResolver
    if (queueServiceResolver && this.job.id) {
      const queue = await queueServiceResolver()
      queue.registerScheduledJob(this.job.id)
    }
  }
}
