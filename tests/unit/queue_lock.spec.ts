import { Job, QueueDriver } from '@lavoro/core'
import { defineConfig } from '@lavoro/core'
import { Queue } from '@lavoro/core'
import { memory } from '@lavoro/memory'
import { Lock, LockFactory } from '@verrou/core'
import { memoryStore } from '@verrou/core/drivers/memory'
import { describe, expect, test, vi } from 'vitest'

class TestJob extends Job {
  async handle(_payload: { value: number }) {}
}

describe('Queue Lock Service', () => {
  test('should throw error when getting lock provider for non-existent connection', async () => {
    const queueConfig = defineConfig({
      jobs: [TestJob],
      connection: 'main',
      connections: {
        main: {
          driver: memory(),
          queues: {
            default: {},
          },
        },
      },
    })

    const queue = new Queue(queueConfig)

    expect(() => queue.getLockProvider('non-existent' as any)).toThrow(
      'No lock provider found for connection: non-existent.',
    )
  })

  test('should automatically create lock service for every connection', async () => {
    const customLockProvider = new LockFactory(memoryStore().factory())

    const queueConfig = defineConfig({
      jobs: [TestJob],
      connection: 'main',
      connections: {
        main: {
          driver: memory(),
          queues: {
            default: {},
          },
        },
        alternative: {
          driver: memory(),
          queues: {
            default: {},
          },
          lockProvider: customLockProvider,
        },
      },
    })

    const queue = new Queue(queueConfig)

    // getLockProvider should throw an error if the queue is not started
    // unless it is explicitly configured in the connection config
    expect(() => queue.getLockProvider('main')).toThrow()
    expect(() => queue.getLockProvider('alternative')).not.toThrow()

    await queue.start()

    // getLockProvider should return driver specific lock provider or
    // the one explicitly configured in the connection config
    expect(() => queue.getLockProvider('main')).not.toThrow()
    expect(() => queue.getLockProvider('alternative')).not.toThrow()

    expect(queue.getLockProvider('main')).not.toBe(customLockProvider)
    expect(queue.getLockProvider('alternative')).toBe(customLockProvider)

    await queue.stop()
  })

  test('should use explicitly configured lock service for connection', async () => {
    const customLockProvider = new LockFactory(memoryStore().factory())

    const queueConfig = defineConfig({
      jobs: [TestJob],
      connection: 'main',
      connections: {
        main: {
          driver: memory(),
          queues: {
            default: {},
          },
          lockProvider: customLockProvider,
        },
      },
    })

    const queue = new Queue(queueConfig)

    expect(() => queue.getLockProvider('main')).not.toThrow()

    const lockService = queue.getLockProvider('main')
    expect(lockService).toBe(customLockProvider)
  })
})

describe('Lock extension during job processing', () => {
  class SlowTestJob extends Job {
    static completed = false
    async handle(_payload: { duration: number }) {
      await new Promise((resolve) => setTimeout(resolve, _payload.duration))
      SlowTestJob.completed = true
    }
  }

  function createMockLock(overrides: Partial<Lock> = {}) {
    return {
      acquireImmediately: vi.fn().mockResolvedValue(true),
      extend: vi.fn(),
      forceRelease: vi.fn().mockResolvedValue(undefined),
      serialize: vi.fn().mockReturnValue('serialized-lock'),
      getRemainingTime: vi.fn().mockReturnValue(1000),
      ...overrides,
    } as unknown as Lock
  }

  function createMockLockFactory(lock: Lock) {
    return {
      restoreLock: vi.fn().mockReturnValue(lock),
    } as unknown as LockFactory
  }

  class TestDriverWithLock extends QueueDriver {
    createLockProvider(): LockFactory {
      return {} as LockFactory
    }

    setLockFactory(factory: LockFactory) {
      this.lockFactory = factory
    }
  }

  async function setupQueue() {
    const queue = new Queue(
      defineConfig({
        jobs: [SlowTestJob],
        connection: 'main',
        connections: {
          main: {
            driver: { constructor: TestDriverWithLock, config: {} },
            queues: { default: {} },
          },
        },
      }),
    )
    await queue.start()
    return queue
  }

  function getDriver(queue: Queue) {
    return (queue as any).drivers.get('main') as TestDriverWithLock
  }

  async function processJobWithLock(
    driver: TestDriverWithLock,
    lockFactory: LockFactory,
    duration: number,
    ttl = 5000,
  ) {
    driver.setLockFactory(lockFactory)
    await (driver as any).process({
      id: 'test-job-id',
      fullyQualifiedName: 'default_SlowTestJob',
      payload: {
        duration,
        _lock: {
          key: 'test-lock',
          ttl,
          owner: 'test',
          expirationTime: Date.now() + ttl,
        },
      },
    })
  }

  test('extends lock when remaining time drops below half TTL', async () => {
    const extendMock = vi.fn()
    // Simulate remaining time dropping: starts at 5000, decreases by 1000 each second
    let remainingTime = 5000
    const lock = createMockLock({
      extend: extendMock.mockImplementation(() => {
        remainingTime = 5000 // Reset to full TTL after extend
      }),
      getRemainingTime: vi.fn().mockImplementation(() => {
        const current = remainingTime
        remainingTime -= 1000 // Decrease by 1s on each check
        return current
      }),
    })
    const lockFactory = createMockLockFactory(lock)

    const queue = await setupQueue()
    const driver = getDriver(queue)

    // Job runs for 4.5s with TTL 5000ms
    // t=0: initial extend (always happens on restore)
    // t=1s: remainingTime=4000 > 2500, no extend
    // t=2s: remainingTime=3000 > 2500, no extend
    // t=3s: remainingTime=2000 <= 2500, extend → remainingTime resets to 5000
    // t=4s: remainingTime=4000 > 2500, no extend
    await processJobWithLock(driver, lockFactory, 4500)

    // 1 initial + 1 when remaining dropped below half TTL
    expect(extendMock).toHaveBeenCalledTimes(2)
    await queue.stop()
  })

  test('prevents concurrent lock extensions', async () => {
    let concurrentCalls = 0
    let maxConcurrentCalls = 0

    const extendMock = vi.fn().mockImplementation(async () => {
      concurrentCalls++
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls)
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Slower than 1s interval
      concurrentCalls--
    })

    const lock = createMockLock({ extend: extendMock })
    const lockFactory = createMockLockFactory(lock)

    const queue = await setupQueue()
    const driver = getDriver(queue)

    await processJobWithLock(driver, lockFactory, 3000)

    expect(maxConcurrentCalls).toBe(1)
    await queue.stop()
  })

  test('job completes even when lock extension fails', async () => {
    SlowTestJob.completed = false
    const extendMock = vi
      .fn()
      .mockRejectedValue(new Error('Lock extend failed'))
    const lock = createMockLock({ extend: extendMock })
    const lockFactory = createMockLockFactory(lock)

    const queue = await setupQueue()
    const driver = getDriver(queue)

    await processJobWithLock(driver, lockFactory, 1500)

    expect(SlowTestJob.completed).toBe(true)
    expect(extendMock).toHaveBeenCalled()
    await queue.stop()
  })
})
