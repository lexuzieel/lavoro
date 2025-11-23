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

  test('should not overlap unless explicitly allowed', async () => {
    let callCount = 0

    /**
     * Long tasks should not overlap
     */
    await Schedule.call('test-task', async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      callCount++
    }).every('second')

    while (callCount < 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Should run only once since we are not overlapping
    expect(callCount).toBe(1)

    /**
     * Short tasks also do not overlap, but since they
     * take less than 1 second this is not noticeable.
     */
    Schedule.clear('test-task')
    callCount = 0

    await Schedule.call('test-task', async () => {
      callCount++
    }).every('second')

    while (callCount < 3) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Should run at least 3 times since we are not
    // overlapping but the task takes less than 1 second
    expect(callCount).toBeGreaterThanOrEqual(3)

    /**
     * Long tasks can be forced to overlap
     */
    Schedule.clear('test-task')
    callCount = 0

    await Schedule.call('test-task', async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      callCount++
    })
      .every('second')
      .overlapping()

    while (callCount < 3) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Should run at least 3 times since we are overlapping
    expect(callCount).toBeGreaterThanOrEqual(3)

    Schedule.clear('test-task')
  })
})
