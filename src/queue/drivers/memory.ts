import { QueueDriver, QueueName } from '../contracts/queue_driver.js'
import { QueueConfig, WorkerOptions } from '../types.js'

import { LockFactory } from '@verrou/core'
import { memoryStore } from '@verrou/core/drivers/memory'

export class MemoryQueueDriver extends QueueDriver {
  constructor(
    queueConfig: QueueConfig,
    options: Record<QueueName, WorkerOptions>,
  ) {
    super(queueConfig, options)
  }

  public createLockProvider() {
    return new LockFactory(memoryStore().factory())
  }
}
