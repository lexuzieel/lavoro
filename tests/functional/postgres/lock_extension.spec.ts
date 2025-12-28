import {
  acquireMutex,
  releaseMutex,
  waitForMutex,
} from '../../helpers/mutex.js'
import { TestContext, logger } from '../../helpers/test_context.js'

import { Job, Schedule } from '@lavoro/core'
import { describe, expect, test, vi } from 'vitest'

let jobRuns = 0
let concurrentJobs = 0
let maxConcurrentJobs = 0

class LongRunningJob extends Job {
  static duration = 8000 // 8 seconds

  async handle(_payload: unknown): Promise<void> {
    concurrentJobs++
    maxConcurrentJobs = Math.max(maxConcurrentJobs, concurrentJobs)
    logger.info({ jobRuns, concurrentJobs, maxConcurrentJobs }, 'Starting job')

    await new Promise((resolve) => setTimeout(resolve, LongRunningJob.duration))

    concurrentJobs--
    jobRuns++
    logger.info({ jobRuns, concurrentJobs }, 'Completed job')
    releaseMutex('long-running-job')
  }
}

describe('Lock extension (PostgreSQL)', { timeout: 60 * 1000 }, () => {
  const ctx = new TestContext()

  ctx.setup([LongRunningJob], 'postgres', { worker: true })

  test('heartbeat prevents job overlap when job runs longer than lock TTL', async () => {
    jobRuns = 0
    concurrentJobs = 0
    maxConcurrentJobs = 0

    acquireMutex('long-running-job')

    // Schedule job every second with 3s lock TTL
    // Job runs for 8s, so without heartbeat the lock would expire
    // and another instance would start (overlap)
    await Schedule.job(LongRunningJob, {}).every('second').lockFor('3s')

    // Wait for at least one job to complete
    await waitForMutex('long-running-job', 20000)

    Schedule.clear()

    // Wait for any concurrent jobs to be counted
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // With working heartbeat, there should never be concurrent jobs
    expect(maxConcurrentJobs).toBe(1)
    expect(jobRuns).toBeGreaterThanOrEqual(1)
  })

  test('job overlap occurs when lock extension fails', async () => {
    jobRuns = 0
    concurrentJobs = 0
    maxConcurrentJobs = 0

    const queue = ctx.getQueue()
    const driver = (queue as any).drivers.get('main')
    const originalLockFactory = driver.lockFactory

    // Wrap restoreLock to return a lock with broken extend
    const originalRestoreLock =
      originalLockFactory.restoreLock.bind(originalLockFactory)
    driver.lockFactory = {
      ...originalLockFactory,
      createLock: originalLockFactory.createLock.bind(originalLockFactory),
      restoreLock: (serialized: string) => {
        const lock = originalRestoreLock(serialized)

        // Make extend fail
        lock.extend = vi.fn().mockImplementation(async () => {
          logger.warn('Mocked extend - failing on purpose')
          throw new Error('Lock extend failed')
        })

        // Force low remaining time to always trigger extend
        lock.getRemainingTime = () => 1000
        return lock
      },
    }

    // Schedule job every second with 3s lock TTL
    // Since extend fails, lock expires and another job can start
    await Schedule.job(LongRunningJob, {}).every('second').lockFor('3s')

    // Wait for lock to expire and overlap to occur
    // Job runs 8s, lock expires ~3s in, scheduler can acquire new lock
    await new Promise((resolve) => setTimeout(resolve, 10000))

    Schedule.clear()

    // Restore original lock factory
    driver.lockFactory = originalLockFactory

    // Wait for jobs to settle
    await new Promise((resolve) => setTimeout(resolve, 1000))

    logger.info({ maxConcurrentJobs, jobRuns }, 'Test completed')

    // With broken heartbeat, jobs should overlap
    expect(maxConcurrentJobs).toBeGreaterThan(1)
  })
})
