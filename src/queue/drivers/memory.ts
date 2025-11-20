import { QueueDriver, QueueName } from '../contracts/queue_driver.js'
import { QueueConfig, WorkerOptions } from '../types.js'

export class MemoryQueueDriver extends QueueDriver {
  constructor(
    queueConfig: QueueConfig,
    options: Record<QueueName, WorkerOptions>,
  ) {
    super(queueConfig, options)
  }
}
