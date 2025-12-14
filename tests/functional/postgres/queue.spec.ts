import { acquireMutex, releaseMutex, waitForMutex } from '../../helpers/mutex.js'
import { TestContext, logger } from '../../helpers/test_context.js'

import { Job } from '@lavoro/core'
import { describe, expect, test } from 'vitest'

class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1))
    logger.info({ payload }, 'Running test job...')
    releaseMutex('test-job')
  }
}

describe('Queue service with disabled worker (PostgreSQL)', () => {
  const ctx = new TestContext()

  ctx.setup([TestJob], 'postgres', {
    // worker: false, // it should be disabled by default
  })

  test('should throw after timeout if worker is disabled', async () => {
    acquireMutex('test-job')
    await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
    // pg-boss fetch interval is 2 seconds, so we wait
    // for 3 seconds to make sure the job was not processed
    await expect(waitForMutex('test-job', 3000)).rejects.toThrow(
      "Mutex 'test-job' timeout",
    )
  })
})

describe(
  'Queue service (PostgreSQL)',
  {
    timeout: 60000,
  },
  () => {
    const ctx = new TestContext()

    ctx.setup([TestJob], 'postgres', {
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
  },
)
