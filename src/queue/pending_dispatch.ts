import { Job, Payload } from './contracts/job.js'
import { QueueName, QueueNameForConnection } from './contracts/queue_driver.js'
import { Queue } from './queue.js'
import { DefaultConnection, QueueConnectionName } from './types.js'

export class PendingDispatch<
  T extends Job,
  P extends Payload<T>,
  C extends QueueConnectionName = DefaultConnection extends { name: infer N }
    ? N extends QueueConnectionName
      ? N
      : QueueConnectionName
    : QueueConnectionName,
> {
  constructor(
    private job: T,
    private payload: P,
  ) {}

  public onConnection<NewC extends QueueConnectionName>(
    connection: NewC,
  ): PendingDispatch<T, P, NewC> {
    this.job.options.connection = connection

    return this as any
  }

  public onQueue(queue: QueueNameForConnection<C>): this {
    this.job.options.queue = queue as QueueName

    return this
  }

  public withQueueServiceResolver(
    queueServiceResolver: () => Promise<Queue>,
  ): this {
    this.job.setQueueServiceResolver(queueServiceResolver)

    return this
  }

  private async execute(): Promise<void> {
    if (!this.job.getQueueServiceResolver) {
      throw new Error(
        'Queue service resolver is not set.\nDid you forget to call Job.setDefaultQueueServiceResolver()?',
      )
    }

    const queue = await this.job.getQueueServiceResolver()
    await queue.enqueue(this.job, this.payload)
  }

  /**
   * By defining the "then" method, PendingDispatch becomes "thenable",
   * allowing it to trigger automatically when await is called.
   */
  public async then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    // When await is called, actually execte pending chain.
    return this.execute().then(onfulfilled, onrejected)
  }
}
