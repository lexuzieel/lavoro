import { Job } from './job.js'

import { EventEmitter } from 'stream'

/**
 * Type-safe queue driver events.
 */
export interface QueueDriverEvents {
  error: [job: Job, error: Error, payload: unknown]
}

/**
 * Type-safe event emitter for the queue driver.
 */
export abstract class QueueDriverEventEmitter extends EventEmitter {
  public override on<K extends keyof QueueDriverEvents>(
    event: K,
    listener: (...args: QueueDriverEvents[K]) => void,
  ): this {
    return super.on(event, listener)
  }

  public override emit<K extends keyof QueueDriverEvents>(
    event: K,
    ...args: QueueDriverEvents[K]
  ): boolean {
    return super.emit(event, ...args)
  }
}
