import { logger } from '../../helpers/test_context.js'

import { Job } from '@lavoro/core'
import { Schedule } from '@lavoro/core'
import { expect } from 'vitest'

export let jobRuns = 0

export class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    logger.info({ payload }, 'Running test job...')
    await new Promise((resolve) => setTimeout(resolve, 1))
    logger.info('Test job completed.')
    jobRuns++
  }
}

export class LongRunningJob extends Job {
  // should be higher than pg-boss polling interval
  public static duration = 8000

  public async handle(_payload: unknown): Promise<void> {
    logger.info('Running long running job...')
    await new Promise((resolve) => setTimeout(resolve, LongRunningJob.duration))
    logger.info('Long running job completed.')
    jobRuns++
  }
}

export const testShouldSchedule = async () => {
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

  return { jobRuns }
}

export const testShouldNotOverlap = async (pollingInterval: number) => {
  jobRuns = 0

  await Schedule.job(LongRunningJob, {}).every('second')

  // Without overlapping, jobs should not run concurrently.
  // We expect only a few jobs to complete sequentially.
  const minExpectedJobRuns = 2
  const maxExpectedJobRuns = 4

  await new Promise((resolve) =>
    setTimeout(
      resolve,
      (minExpectedJobRuns + 1) * (pollingInterval + LongRunningJob.duration),
    ),
  )

  Schedule.clear()

  await new Promise((resolve) =>
    setTimeout(resolve, pollingInterval + LongRunningJob.duration),
  )

  expect(jobRuns).toBeGreaterThanOrEqual(minExpectedJobRuns)
  expect(jobRuns).toBeLessThanOrEqual(maxExpectedJobRuns)

  return { jobRuns, minExpectedJobRuns, maxExpectedJobRuns }
}

export const testShouldOverlap = async (pollingInterval: number) => {
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
    setTimeout(resolve, pollingInterval + LongRunningJob.duration),
  )

  Schedule.clear()

  await new Promise((resolve) =>
    setTimeout(resolve, pollingInterval + LongRunningJob.duration),
  )

  expect(jobRuns).toBeGreaterThanOrEqual(minExpectedJobRuns)
  expect(jobRuns).toBeLessThanOrEqual(maxExpectedJobRuns)

  return { jobRuns, minExpectedJobRuns, maxExpectedJobRuns }
}
