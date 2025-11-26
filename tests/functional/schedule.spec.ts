import { Schedule } from '../../src/schedule/schedule.js'
import { ScheduleRegistry } from '../../src/schedule/schedule_registry.js'

import { beforeEach, describe, expect, test } from 'vitest'

describe('Schedule', () => {
  beforeEach(() => {
    Schedule.clear()
  })

  test('should be able to clear schedule', async () => {
    await Schedule.call('test-task-1', async () => {
      // no-op
    }).every('second')

    await Schedule.call('test-task-2', async () => {
      // no-op
    }).every('second')

    Schedule.clear()
    expect(Object.keys(ScheduleRegistry.all()).length).toBe(0)
  })

  test('should be able to clear specific task', async () => {
    await Schedule.call('test-task-1', async () => {
      // no-op
    }).every('second')

    await Schedule.call('test-task-2', async () => {
      // no-op
    }).every('second')

    Schedule.clear('test-task-1')
    expect(Object.keys(ScheduleRegistry.all()).length).toBe(1)
    expect(Object.keys(ScheduleRegistry.all())).toContain('test-task-2')
  })

  test('should not be able to schedule a task without explicit schedule', async () => {
    await expect(
      Schedule.call('test-task', async () => {
        // no-op
      }),
    ).rejects.toThrow('No schedule pattern defined')
  })

  test('should be able to run a job with cron pattern', async () => {
    let callCount = 0
    const expectedCallCount = 3

    await Schedule.call('test-task', async () => {
      callCount++
    }).cron('* * * * * *') // Every second

    while (callCount < expectedCallCount) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    expect(callCount).toBe(expectedCallCount)
  })

  test('should be able to run a job with fluent interval', async () => {
    let callCount = 0
    const expectedCallCount = 3

    const start = Date.now()

    await Schedule.call('test-task', async () => {
      callCount++
    }).every('second')

    while (callCount < expectedCallCount) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const duration = Date.now() - start

    expect(callCount).toBe(expectedCallCount)
    expect(duration).toBeGreaterThan(2000)
    expect(duration).toBeLessThan(4000)
  })

  test('should not overlap by default', async () => {
    Schedule.clear()
    let callCount = 0

    await Schedule.call('test-task', async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000))
      callCount++
    }).every('second')

    // Wait for 6 seconds
    await new Promise((resolve) => setTimeout(resolve, 6 * 1000 + 100))

    Schedule.clear()

    // Each task takes 4 seconds, so after
    // 6 seconds, we should have had 1 call.
    expect(callCount).toBe(1)
  })

  test('should overlap if explicitly allowed', async () => {
    Schedule.clear()
    let callCount = 0

    await Schedule.call('test-task', async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000))
      callCount++
    })
      .every('second')
      .overlapping()

    // Wait for 6 seconds
    await new Promise((resolve) => setTimeout(resolve, 6 * 1000 + 100))

    Schedule.clear()

    // Each task takes 4 seconds, so after
    // 6 seconds, we should have had 2 calls.
    expect(callCount).toBe(2)
  })
})
