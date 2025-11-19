import { Job } from '../../src/queue/contracts/job.js'
import { defineConfig } from '../../src/queue/define_config.js'
import { Queue } from '../../src/queue/queue.js'

import { beforeAll, describe, expect, test } from 'vitest'

class TestJob extends Job {
  async handle(_payload: { test: string }) {}
}

describe('PendingDispatch', () => {
  let queue: Queue

  beforeAll(() => {
    const config = defineConfig({
      jobs: [TestJob],
      connection: 'main',
      connections: {
        main: {
          driver: 'memory',
          queues: {
            default: { concurrency: 1 },
            other: { concurrency: 1 },
          },
        },
      },
    })
    queue = new Queue(config)
    Job.setDefaultQueueServiceResolver(() => Promise.resolve(queue))
  })

  test('onConnection updates connection', () => {
    const pending = TestJob.dispatch({ test: 'hello' }).onConnection(
      'my-connection',
    )
    expect(pending).toBeDefined()

    // Get private 'job' property
    const pendingJob = (pending as any).job as Job
    expect(pendingJob.options.connection).toBe('my-connection')
  })

  test('onQueue updates queue', () => {
    const pending = TestJob.dispatch({ test: 'hello' }).onQueue('my-queue')
    expect(pending).toBeDefined()

    // Get private 'job' property
    const pendingJob = (pending as any).job as Job
    expect(pendingJob.options.queue).toBe('my-queue')
  })

  test('throws error when queue service resolver is not set', async () => {
    class UnresolvedJob extends Job {
      async handle(_payload: { test: string }) {}
    }

    // Clear the default resolver
    const originalResolver = Job['defaultQueueServiceResolver']
    Job['defaultQueueServiceResolver'] = undefined as any

    await expect(UnresolvedJob.dispatch({ test: 'hello' })).rejects.toThrow(
      'Queue service resolver is not set',
    )

    // Restore
    Job['defaultQueueServiceResolver'] = originalResolver
  })
})
