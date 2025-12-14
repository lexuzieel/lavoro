import { getDistributedLockKey } from '@lavoro/core'
import { Schedule } from '@lavoro/core'
import { beforeEach, describe, expect, test } from 'vitest'

const prepareLock = async (name: string) => {
  const lockProvider = (Schedule as any).getLockProvider()
  const lock = lockProvider.createLock(getDistributedLockKey(name), '10s')
  return lock
}

describe('Schedule (distributed locking)', () => {
  beforeEach(() => {
    Schedule.clear()
  })

  // test('should be able to use custom lock provider', async () => {
  //   const customLockProvider = new LockFactory(memoryStore().factory())

  //   Schedule.setLockProviderResolver(() => customLockProvider)
  //   expect((Schedule as any).getLockProvider()).toBe(customLockProvider)
  // })

  test('should skip execution if lock is already acquired', async () => {
    const taskName = 'lock-test'
    let executionCount = 0

    const lock = await prepareLock(taskName)
    const acquired = await lock.acquire()

    expect(acquired).toBe(true)

    await Schedule.call(taskName, async () => {
      executionCount++
    }).every('second')

    await new Promise((resolve) => setTimeout(resolve, 2000))

    expect(executionCount).toBe(0)

    await lock.release()

    Schedule.clear(taskName)

    await Schedule.call(taskName, async () => {
      executionCount++
    }).every('second')

    await new Promise((resolve) => setTimeout(resolve, 1500))

    expect(executionCount).toBeGreaterThanOrEqual(1)
  })

  //   test('should release lock after execution', async () => {
  //     let executionCount = 0

  //     await Schedule.call('release-test', async () => {
  //       executionCount++
  //     }).cron('* * * * * *')

  //     await new Promise((resolve) => setTimeout(resolve, 2500))
  //     expect(executionCount).toBeGreaterThanOrEqual(2)
  //   })

  //   test('should release lock even on error', async () => {
  //     let executionCount = 0

  //     await Schedule.call('error-test', async () => {
  //       executionCount++
  //       if (executionCount === 1) {
  //         throw new Error('Test error')
  //       }
  //     }).cron('* * * * * *')

  //     await new Promise((resolve) => setTimeout(resolve, 2500))
  //     expect(executionCount).toBeGreaterThanOrEqual(2)
  //   })
})
