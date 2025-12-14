import {
  QueueDriver,
  QueueDriverConfig,
  ConfiguredDriver,
  QueueConfig,
  WorkerOptions,
} from '@lavoro/core'

import { LockFactory } from '@verrou/core'
import { memoryStore } from '@verrou/core/drivers/memory'

export class MemoryQueueDriver extends QueueDriver {
  constructor(
    queueConfig: QueueConfig,
    options: Record<string, WorkerOptions>,
    config: QueueDriverConfig = {},
  ) {
    super(queueConfig, options, config)
  }

  public createLockProvider() {
    return new LockFactory(memoryStore().factory())
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
