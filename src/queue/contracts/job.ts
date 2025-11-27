import { PendingDispatch } from '../pending_dispatch.js'
import { Queue } from '../queue.js'
import { QueueConnectionName } from '../types.js'

import { SerializedLock } from '@lavoro/verrou/types'
import { randomUUID } from 'node:crypto'

export type Payload<T extends Job> = T extends Job<infer P> ? P : unknown

export type PayloadWithLock<T extends Job, P extends Payload<T>> = P & {
  _lock?: SerializedLock
}

export type Options = {
  connection?: QueueConnectionName
  queue?: string
  retries: number
  delay: number
}

export abstract class Job<P = unknown> {
  private _id: string = randomUUID()

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

  public get connection(): QueueConnectionName | undefined {
    return this.options.connection
  }

  public set connection(connection: QueueConnectionName | undefined) {
    this.options.connection = connection
  }

  public get queue(): string | undefined {
    return this.options.queue
  }

  public set queue(queue: string | undefined) {
    this.options.queue = queue
  }

  public get name(): string {
    return this.constructor.name
  }

  public get id(): string {
    return this._id
  }

  public set id(id: string) {
    this._id = id
  }

  public get fullyQualifiedName(): string {
    if (!this.options.queue) {
      throw new Error('Queue is not set.')
    }

    return Job.compileName(this.options.queue, this.name)
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
