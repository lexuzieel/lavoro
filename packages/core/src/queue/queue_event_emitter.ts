import {
  QueueDriverEventEmitter,
  QueueDriverEvents,
} from './contracts/queue_driver_event_emitter.js'

/**
 * Queue service can emit any of the queue driver
 * events alongside its own events (currently none).
 */
export interface QueueEvents extends QueueDriverEvents {}

/**
 * Type-safe event emitter for the queue service.
 */
export abstract class QueueEventEmitter extends QueueDriverEventEmitter {
  public override on<K extends keyof QueueEvents>(
    event: K,
    listener: (...args: QueueEvents[K]) => void,
  ): this {
    return super.on(event, listener)
  }

  public override emit<K extends keyof QueueEvents>(
    event: K,
    ...args: QueueEvents[K]
  ): boolean {
    return super.emit(event, ...args)
  }
}
