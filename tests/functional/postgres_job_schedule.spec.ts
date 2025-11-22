import { Job } from '../../src/queue/contracts/job.js'
import { Schedule } from '../../src/schedule/schedule.js'
import { TestContext, logger } from '../helpers/test_context.js'

import { describe, expect, test } from 'vitest'

let callCount = 0

class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1))
    logger.info({ payload }, 'Running test job...')
    callCount++
  }
}

describe(
  'Job schedule (PostgreSQL)',
  {
    timeout: 30000,
  },
  () => {
    const ctx = new TestContext()

    ctx.setup([TestJob], 'postgres', {
      worker: true,
    })

    test('should be able to schedule a job', async () => {
      callCount = 0

      await Schedule.job(TestJob, {
        arg1: 'hello',
        arg2: 1,
      })
        .onConnection('main')
        .onQueue('default')
        .every('second')

      while (callCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      expect(callCount).toBe(2)
    })
  },
)
