import {
  acquireMutex,
  releaseMutex,
  waitForMutex,
} from '../../helpers/mutex.js'
import { TestContext, logger } from '../../helpers/test_context.js'

import { Job } from '@lavoro/core'
import { describe, expect, test } from 'vitest'

let jobRuns = 0
let slowJobCompleted = false

class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    logger.info({ payload }, 'Running test job...')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    logger.info('Test job completed.')
    releaseMutex('test-job')
    jobRuns++
  }
}

class SlowJob extends Job {
  public async handle(payload: { duration: number }): Promise<void> {
    logger.info({ payload }, 'Starting slow job...')
    await new Promise((resolve) => setTimeout(resolve, payload.duration))
    slowJobCompleted = true
    logger.info({ payload }, 'Slow job completed')
    releaseMutex('slow-job')
  }
}

class JobWithError extends Job {
  public async handle(payload: { error: string }): Promise<void> {
    throw new Error(payload.error)
  }
}

describe(
  'Queue service (Memory)',
  {
    timeout: 60000,
  },
  () => {
    const ctx = new TestContext()

    ctx.setup([TestJob, SlowJob, JobWithError], 'memory', {
      worker: true,
    })

    test('should be able to dispatch a job onto default connection and queue', async () => {
      acquireMutex('test-job')
      await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
      await waitForMutex('test-job')
    })

    test('should be able to dispatch a job onto any registered connection and queue', async () => {
      // default connection and queue
      acquireMutex('test-job')
      await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
      await waitForMutex('test-job')

      // default connection and specific queue
      acquireMutex('test-job')
      await TestJob.dispatch({ arg1: 'hello', arg2: 1 }).onQueue('custom-queue')
      await waitForMutex('test-job')

      // specific connection and specific queue
      acquireMutex('test-job')
      await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
        .onConnection('main')
        .onQueue('custom-queue')
      await waitForMutex('test-job')

      // specific connection and default queue
      acquireMutex('test-job')
      await TestJob.dispatch({ arg1: 'hello', arg2: 1 }).onConnection(
        'alternative',
      )
      await waitForMutex('test-job')

      // specific connection and specific queue on alternative connection
      acquireMutex('test-job')
      await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
        .onConnection('alternative')
        .onQueue('first-queue')
      await waitForMutex('test-job')
    })

    test('graceful shutdown waits for in-flight jobs to complete', async () => {
      slowJobCompleted = false
      acquireMutex('slow-job')

      // Dispatch a job that takes 2 seconds
      await SlowJob.dispatch({ duration: 2000 })

      // Wait a bit for the job to start processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Graceful stop should wait for the job to complete
      await ctx.stopQueue({ graceful: true, timeout: 10000 })

      expect(slowJobCompleted).toBe(true)
    })

    test('non-graceful shutdown does not wait for in-flight jobs', async () => {
      slowJobCompleted = false
      acquireMutex('slow-job')

      // Dispatch a job that takes 5 seconds
      await SlowJob.dispatch({ duration: 5000 })

      // Wait a bit for the job to start processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Non-graceful stop should return immediately
      const startTime = Date.now()
      await ctx.stopQueue({ graceful: false })
      const elapsed = Date.now() - startTime

      // Should complete quickly (not wait 5 seconds)
      expect(elapsed).toBeLessThan(1000)
      expect(slowJobCompleted).toBe(false)
    })

    test('graceful shutdown times out after specified duration', async () => {
      slowJobCompleted = false
      acquireMutex('slow-job')

      // Dispatch a job that takes 10 seconds
      await SlowJob.dispatch({ duration: 10000 })

      // Wait a bit for the job to start processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Graceful stop with 1 second timeout should reject
      await expect(
        ctx.stopQueue({ graceful: true, timeout: 1000 }),
      ).rejects.toThrow('Graceful shutdown timeout reached')

      expect(slowJobCompleted).toBe(false)

      // Force stop so afterEach doesn't hang
      await ctx.stopQueue({ graceful: false })
    })

    test('should emit error event when job throws', async () => {
      const queue = ctx.getQueue()

      let error: Error | undefined

      queue.on('job:error', (err, job) => {
        if (job.name == 'JobWithError') {
          error = err
        }
      })

      await JobWithError.dispatch({ error: 'error thrown inside the job' })

      expect(error?.message).toBe('error thrown inside the job')
    })

    test('should throw when trying to enqueue for non-existent worker', async () => {
      const queue: any = ctx.getQueue()

      // Clear all fastq queues inside the memory driver so
      // `this.queues.get(job.fullyQualifiedName)` returns undefined.
      queue.drivers.get('main').queues.clear()

      await expect(
        TestJob.dispatch({ arg1: 'hello', arg2: 1 }),
      ).rejects.toThrow('No worker found for job: default_TestJob')
    })

    test('should throw when trying to enqueue in a pausing or stopped queue', async () => {
      const queue: any = ctx.getQueue()

      const driver = queue.drivers.get('main')

      const timeout = 1000

      /**
       * Simulate a running job that runs shorter than the timeout.
       */
      driver.state.runningJobCount++
      setTimeout(() => {
        driver.state.runningJobCount--
      }, timeout / 2)

      const queues = Array.from(driver.queues.values())

      /**
       * This puts the driver into `pausing` state and makes
       * it wait for currently running jobs to finish.
       */
      driver.waitForQueues(queues, timeout)

      await expect(
        TestJob.dispatch({ arg1: 'hello', arg2: 1 }),
      ).rejects.toThrow(
        'Queue driver is shutting down and cannot accept new jobs',
      )

      /**
       * Simulate queue driver being stopped.
       * We don't directly call stop() as not
       * to unregister jobs.
       */
      queue.drivers.get('main').state.isStarted = false

      await expect(
        TestJob.dispatch({ arg1: 'hello', arg2: 1 }),
      ).rejects.toThrow('Queue driver is not started')
    })
  },
)
