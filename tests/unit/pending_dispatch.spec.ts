import { Job } from '@lavoro/core'
import { defineConfig } from '@lavoro/core'
import { Queue } from '@lavoro/core'
import { memory } from '@lavoro/memory'
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
          driver: memory(),
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
      'alternative',
    )
    expect(pending).toBeDefined()

    // Get private 'job' property
    const pendingJob = (pending as any).job as Job
    expect(pendingJob.options.connection).toBe('alternative')
  })

  test('onQueue updates queue', () => {
    const pending = TestJob.dispatch({ test: 'hello' })
      .onConnection('main')
      .onQueue('custom-queue')
    expect(pending).toBeDefined()

    // Get private 'job' property
    const pendingJob = (pending as any).job as Job
    expect(pendingJob.options.queue).toBe('custom-queue')
  })

  test('onQueue is type-safe based on connection', () => {
    // This should work: 'main' connection has 'custom-queue'
    const pending1 = TestJob.dispatch({ test: 'hello' })
      .onConnection('main')
      .onQueue('custom-queue')
    expect(pending1).toBeDefined()

    // This should work: 'alternative' connection has 'first-queue'
    const pending2 = TestJob.dispatch({ test: 'hello' })
      .onConnection('alternative')
      .onQueue('first-queue')
    expect(pending2).toBeDefined()

    // This would fail at compile time (uncomment to test):
    // const pending3 = TestJob.dispatch({ test: 'hello' })
    //   .onConnection('alternative')
    //   .onQueue('custom-queue')

    // Error: Argument of type '"custom-queue"' is not assignable
    // to parameter of type 'QueueNameForConnection<"alternative">'.
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
