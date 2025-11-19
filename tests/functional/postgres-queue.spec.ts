import { Job } from '../../src/queue/contracts/job.js'
import { acquireMutex, releaseMutex, waitForMutex } from '../helpers/mutex.js'
import { TestContext, logger } from '../helpers/test_context.js'

import { describe, test } from 'vitest'

class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    logger.info({ payload }, 'Running test job...')
    releaseMutex('test-job')
  }
}

describe('Queue service with PostgreSQL driver', () => {
  const ctx = new TestContext()

  ctx.setup([TestJob], 'postgres')

  test(
    'should be able to dispatch a job onto default connection and queue',
    {
      timeout: 10000,
    },
    async () => {
      acquireMutex('test-job')
      await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
      await waitForMutex('test-job')
    },
  )
})
