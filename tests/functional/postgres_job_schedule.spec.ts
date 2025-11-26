import { Job } from '../../src/queue/contracts/job.js'
import { Schedule } from '../../src/schedule/schedule.js'
import { TestContext, logger } from '../helpers/test_context.js'

import { describe, expect, test } from 'vitest'

let jobRuns = 0

class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    logger.info({ payload }, 'Running test job...')
    await new Promise((resolve) => setTimeout(resolve, 1))
    logger.info('Test job completed.')
    jobRuns++
  }
}

class LongRunningJob extends Job {
  public static duration = 4000 // should be higher than pg-boss polling interval

  public async handle(_payload: unknown): Promise<void> {
    logger.info('Running long running job...')
    await new Promise((resolve) => setTimeout(resolve, LongRunningJob.duration))
    logger.info('Long running job completed.')
    jobRuns++
  }
}

describe(
  'Job schedule (PostgreSQL)',
  {
    timeout: 30000,
  },
  () => {
    const ctx = new TestContext()

    ctx.setup([TestJob, LongRunningJob], 'postgres', {
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

    test(
      'should not overlap by default',
      {
        timeout: 30000,
      },
      async () => {
        jobRuns = 0

        await Schedule.job(LongRunningJob, {}).every('second')

        const expectedJobRuns = 3

        await new Promise((resolve) =>
          setTimeout(
            resolve,
            expectedJobRuns * (2000 + LongRunningJob.duration) + 100,
          ),
        )

        Schedule.clear()

        expect(jobRuns).toBe(expectedJobRuns)

        // TODO: Get actual scheduled job count from pg-boss
        // which should be equal to the expectedJobRuns.
        // It is implemented, however not properly tested.
      },
    )
  },
)
