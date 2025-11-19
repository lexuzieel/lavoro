import { PendingDispatch } from '../pending_dispatch.js'
import { Queue } from '../queue.js'
import { QueueConnectionName } from '../types.js'
import { QueueName } from './queue_driver.js'

export type Payload<T extends Job> = T extends Job<infer P> ? P : unknown

export type Options = {
  connection?: QueueConnectionName
  queue?: QueueName
  retries: number
  delay: number
}

export abstract class Job<P = unknown> {
  public options: Options = {
    retries: 3,
    delay: 0,
  }

  public static compileName(queue: string, name: string): string {
    return `${queue}_${name}`
  }

  public static parseName(name: string): { queue: string; name: string } {
    const [q, n] = name.split(/_(.+)/) // split on the first underscore only
    return { queue: q, name: n }
  }

  public get name(): string {
    return this.constructor.name
  }

  public get fullyQualifiedName(): string {
    if (!this.options.queue) {
      throw new Error('Queue is not set.')
    }

    return Job.compileName(this.options.queue, this.constructor.name)
  }

  private static defaultQueueServiceResolver: () => Promise<Queue>

  public static setDefaultQueueServiceResolver(
    queueServiceResolver: () => Promise<Queue>,
  ): void {
    this.defaultQueueServiceResolver = queueServiceResolver
  }

  public setQueueServiceResolver(
    queueServiceResolver: () => Promise<Queue>,
  ): void {
    this.queueServiceResolver = queueServiceResolver
  }

  private queueServiceResolver?: () => Promise<Queue> = undefined

  public get getQueueServiceResolver(): () => Promise<Queue> {
    return this.queueServiceResolver || Job.defaultQueueServiceResolver
  }

  /**
   * Handle the job with the typed payload.
   */
  public abstract handle(payload: P): Promise<void>

  /**
   * Dispatch a job of type with a typed payload.
   */
  public static dispatch<T extends Job, P extends Payload<T>>(
    this: new () => T,
    payload: P,
  ): PendingDispatch<T, P> {
    const job = new this() as T
    return new PendingDispatch<T, P>(job, payload)
  }
}
