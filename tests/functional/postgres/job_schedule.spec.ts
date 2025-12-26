import { TestContext } from '../../helpers/test_context.js'
import {
  LongRunningJob,
  TestJob,
  testShouldNotOverlap,
  testShouldOverlap,
  testShouldSchedule,
} from '../common/job_schedule.js'

import { describe, expect, test } from 'vitest'

const PG_BOSS_POLLING = 2000

describe(
  'Job schedule (PostgreSQL)',
  {
    timeout: 60 * 1000, // 1 minute
  },
  () => {
    const ctx = new TestContext()

    ctx.setup([TestJob, LongRunningJob], 'postgres', {
      worker: true,
    })

    test('should be able to schedule a job', async () => {
      await testShouldSchedule()
    })

    test('should not overlap by default', async () => {
      const { minExpectedJobRuns, maxExpectedJobRuns } =
        await testShouldNotOverlap(PG_BOSS_POLLING)

      const stats = await ctx.getPgBossStats('main', 'default', LongRunningJob)

      expect(stats.totalCount).toBeGreaterThanOrEqual(minExpectedJobRuns)
      expect(stats.totalCount).toBeLessThanOrEqual(maxExpectedJobRuns)
    })

    test('should overlap if explicitly allowed', async () => {
      const { minExpectedJobRuns, maxExpectedJobRuns } =
        await testShouldOverlap(PG_BOSS_POLLING)

      const stats = await ctx.getPgBossStats(
        'main',
        'high-throughput',
        LongRunningJob,
      )

      expect(stats.totalCount).toBeGreaterThanOrEqual(minExpectedJobRuns)
      expect(stats.totalCount).toBeLessThanOrEqual(maxExpectedJobRuns)
    })

    // test('should overlap when using different lock providers', async () => {
    //   jobRuns = 0

    //   const pending1 = Schedule.job(LongRunningJob, {})
    //     .every('second')
    //     .onConnection('main')
    //     .onQueue('high-throughput')
    //     .lockFor(LongRunningJob.duration)
    //   // ;(pending1 as any).lockServiceResolver = () =>
    //   //   new LockFactory(
    //   //     knexStore({
    //   //       connection: knex({
    //   //         client: 'pg',
    //   //         connection: {
    //   //           host: ctx.getPostgresConfig().host,
    //   //           port: Number(ctx.getPostgresConfig().port),
    //   //           user: ctx.getPostgresConfig().user,
    //   //           password: ctx.getPostgresConfig().password,
    //   //           database: ctx.getPostgresConfig().database,
    //   //         },
    //   //       }),
    //   //       autoCreateTable: true,
    //   //       tableName: 'lavoro_locks_1',
    //   //     }).factory(),
    //   //   )

    //   // ;(pending1 as any).lockServiceResolver = () =>
    //   //   new LockFactory(memoryStore().factory())

    //   const pending2 = Schedule.job(LongRunningJob, {})
    //     .every('second')
    //     .onConnection('main')
    //     .onQueue('high-throughput')
    //     .lockFor(LongRunningJob.duration)
    //   // ;(pending2 as any).lockServiceResolver = () =>
    //   //   new LockFactory(
    //   //     knexStore({
    //   //       connection: knex({
    //   //         client: 'pg',
    //   //         connection: {
    //   //           host: ctx.getPostgresConfig().host,
    //   //           port: Number(ctx.getPostgresConfig().port),
    //   //           user: ctx.getPostgresConfig().user,
    //   //           password: ctx.getPostgresConfig().password,
    //   //           database: ctx.getPostgresConfig().database,
    //   //         },
    //   //       }),
    //   //       autoCreateTable: true,
    //   //       tableName: 'lavoro_locks_2',
    //   //     }).factory(),
    //   //   )

    //   // Make cron job names unique to avoid conflicts.
    //   // We can do it like this since queue name is used for cron job name.
    //   ;(pending1 as any)._queue += '_1'
    //   ;(pending2 as any)._queue += '_2'

    //   // ;(pending2 as any).lockServiceResolver = () =>
    //   //   new LockFactory(memoryStore().factory())

    //   // await pending1

    //   await Promise.all([pending1, pending2])

    //   const minExpectedJobRuns = 6
    //   const maxExpectedJobRuns = 10

    //   await new Promise((resolve) =>
    //     setTimeout(resolve, PG_BOSS_POLLING + LongRunningJob.duration),
    //   )

    //   Schedule.clear()

    //   await new Promise((resolve) =>
    //     setTimeout(resolve, PG_BOSS_POLLING + LongRunningJob.duration),
    //   )

    //   // expect(jobRuns).toBeGreaterThanOrEqual(minExpectedJobRuns)
    //   // expect(jobRuns).toBeLessThanOrEqual(maxExpectedJobRuns)

    //   const stats = await ctx.getPgBossStats(
    //     'main',
    //     'high-throughput',
    //     LongRunningJob,
    //   )

    //   console.log({ jobRuns, stats: stats.totalCount })

    //   // expect(stats.totalCou  nt).toBeGreaterThanOrEqual(minExpectedJobRuns)
    //   // expect(stats.totalCount).toBeLessThanOrEqual(maxExpectedJobRuns)
    // })
  },
)
