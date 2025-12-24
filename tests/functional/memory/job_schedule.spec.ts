import { TestContext } from '../../helpers/test_context.js'
import {
  LongRunningJob,
  TestJob,
  testShouldNotOverlap,
  testShouldOverlap,
  testShouldSchedule,
} from '../common/job_schedule.js'

import { describe, test } from 'vitest'

const POLLING_INTERVAL = 0

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
      await testShouldSchedule()
    })

    test('should not overlap by default', async () => {
      await testShouldNotOverlap(POLLING_INTERVAL)

      // const stats = await ctx.getPgBossStats('main', 'default', LongRunningJob)

      // expect(stats.totalCount).toBeGreaterThanOrEqual(minExpectedJobRuns)
      // expect(stats.totalCount).toBeLessThanOrEqual(maxExpectedJobRuns)
    })

    test('should overlap if explicitly allowed', async () => {
      await testShouldOverlap(POLLING_INTERVAL)

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
