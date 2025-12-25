import { Job, Queue, QueueDriver, defineConfig } from '@lavoro/core'
import type { LockFactory } from '@verrou/core'
import { describe, expect, test, vi } from 'vitest'

class TestJob extends Job {
  async handle(_payload: { message: string }) {}
}

class TestQueueDriver extends QueueDriver {
  createLockProvider(): LockFactory {
    return {} as LockFactory
  }

  emitError(job: Job, error: Error, payload: unknown): void {
    this.emit('error', job, error, payload)
  }
}

function testDriver() {
  return { constructor: TestQueueDriver, config: {} }
}

function createQueue() {
  return new Queue(
    defineConfig({
      jobs: [TestJob],
      connection: 'main',
      connections: {
        main: {
          driver: testDriver(),
          queues: {
            default: {},
          },
        },
      },
    }),
  )
}

describe('QueueDriverEventEmitter', () => {
  test('should not throw when emitting error without listeners', async () => {
    const queue = createQueue()
    await queue.start()

    const driver = (queue as any).drivers.get('main') as TestQueueDriver
    const job = new TestJob()
    job.options.queue = 'default'

    expect(() => driver.emitError(job, new Error('test'), {})).not.toThrow()

    await queue.stop()
  })

  test('driver error events propagate to queue service', async () => {
    const queue = createQueue()
    await queue.start()

    const listener = vi.fn()
    queue.on('error', listener)

    const driver = (queue as any).drivers.get('main') as TestQueueDriver
    const job = new TestJob()
    job.options.queue = 'default'

    driver.emitError(job, new Error('test'), { message: 'payload' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][1].message).toBe('test')

    await queue.stop()
  })
})
