import { TestContext, logger } from '../../helpers/test_context.js'

import { Job } from '@lavoro/core'
import { Schedule } from '@lavoro/core'
import { describe, expect, test } from 'vitest'

let jobRuns = 0

const POLLING_INTERVAL = 0

class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    logger.info({ payload }, 'Running test job...')
    await new Promise((resolve) => setTimeout(resolve, 1))
    logger.info('Test job completed.')
    jobRuns++
  }
}

class LongRunningJob extends Job {
  public static duration = 8000 // should be higher than pg-boss polling interval

  public async handle(_payload: unknown): Promise<void> {
    logger.info('Running long running job...')
    await new Promise((resolve) => setTimeout(resolve, LongRunningJob.duration))
    logger.info('Long running job completed.')
    jobRuns++
  }
}

describe(
  'Job schedule (Memory)',
  {
    timeout: 60 * 1000, // 1 minute
  },
  () => {
    const ctx = new TestContext()

    ctx.setup([TestJob, LongRunningJob], 'memory', {
      worker: true,
    })

    test('should be able to schedule a job', async () => {
      jobRuns = 0

      await Schedule.job(TestJob, {
        arg1: 'hello',
        arg2: 1,
      })
        .onConnection('main')
        .onQueue('default')
        .every('second')

      while (jobRuns < 2) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      expect(jobRuns).toBe(2)
    })

    test('should not overlap by default', async () => {
      jobRuns = 0

      await Schedule.job(LongRunningJob, {}).every('second')

      // Without overlapping, jobs should not run concurrently.
      // We expect only a few jobs to complete sequentially.
      const minExpectedJobRuns = 2
      const maxExpectedJobRuns = 4

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          (minExpectedJobRuns + 1) *
            (POLLING_INTERVAL + LongRunningJob.duration),
        ),
      )

      Schedule.clear()

      await new Promise((resolve) =>
        setTimeout(resolve, POLLING_INTERVAL + LongRunningJob.duration),
      )

      expect(jobRuns).toBeGreaterThanOrEqual(minExpectedJobRuns)
      expect(jobRuns).toBeLessThanOrEqual(maxExpectedJobRuns)

      // const stats = await ctx.getPgBossStats('main', 'default', LongRunningJob)

      // expect(stats.totalCount).toBeGreaterThanOrEqual(minExpectedJobRuns)
      // expect(stats.totalCount).toBeLessThanOrEqual(maxExpectedJobRuns)
    })

    test('should overlap if explicitly allowed', async () => {
      jobRuns = 0

      await Schedule.job(LongRunningJob, {})
        .onQueue('high-throughput') // queue that processes many jobs in parallel
        .every('second')
        .overlapping()

      // With overlapping enabled, multiple jobs should run concurrently
      // LongRunningJob.duration = 8000ms, scheduled every 1000ms
      // So we expect roughly 7-9 jobs to be scheduled (allowing for timing variations)
      const minExpectedJobRuns = 6
      const maxExpectedJobRuns = 10

      await new Promise((resolve) =>
        setTimeout(resolve, POLLING_INTERVAL + LongRunningJob.duration),
      )

      Schedule.clear()

      await new Promise((resolve) =>
        setTimeout(resolve, POLLING_INTERVAL + LongRunningJob.duration),
      )

      expect(jobRuns).toBeGreaterThanOrEqual(minExpectedJobRuns)
      expect(jobRuns).toBeLessThanOrEqual(maxExpectedJobRuns)

      // const stats = await ctx.getPgBossStats(
      //   'main',
      //   'high-throughput',
      //   LongRunningJob,
      // )

      // expect(stats.totalCount).toBeGreaterThanOrEqual(minExpectedJobRuns)
      // expect(stats.totalCount).toBeLessThanOrEqual(maxExpectedJobRuns)
    })
  },
)
