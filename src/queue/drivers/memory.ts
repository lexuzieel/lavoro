import { QueueDriver } from '../contracts/queue_driver.js'
import { WorkerOptions } from '../types.js'

export class MemoryQueueDriver extends QueueDriver {
  constructor(queueConfigs: Record<string, WorkerOptions> = {}) {
    super(queueConfigs)
  }

  public async start(): Promise<void> {
    await super.start()
  }

  public async stop(): Promise<void> {
    await super.stop()
  }
}
