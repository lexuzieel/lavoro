import { ScheduleRegistry } from '@lavoro/core'
import { Cron } from 'croner'
import { beforeEach, describe, expect, test } from 'vitest'

describe('ScheduleRegistry', () => {
  beforeEach(() => {
    ScheduleRegistry.clear()
  })

  test('should not be able to add the same job twice', async () => {
    ScheduleRegistry.add('test-task', new Cron('* * * * * *', async () => {}))
    expect(() =>
      ScheduleRegistry.add(
        'test-task',
        new Cron('* * * * * *', async () => {}),
      ),
    ).toThrow("Cron instance with name 'test-task' already exists")
  })

  test('should be able to get a cron job from the registry by name', async () => {
    ScheduleRegistry.add('test-task', new Cron('* * * * * *', async () => {}))
    const cron = ScheduleRegistry.get('test-task')
    expect(cron).toBeDefined()
  })

  test('should be able to get a list of all cron jobs in the registry', async () => {
    ScheduleRegistry.add('test-task-1', new Cron('* * * * * *', async () => {}))
    ScheduleRegistry.add('test-task-2', new Cron('* * * * * *', async () => {}))
    const list = ScheduleRegistry.all()
    expect(list).toBeDefined()
    expect(Object.keys(list).length).toBe(2)
    expect(list['test-task-1']).toBeDefined()
    expect(list['test-task-2']).toBeDefined()
  })

  test('should be able to clear a cron job from the registry by name', async () => {
    ScheduleRegistry.add('test-task', new Cron('* * * * * *', async () => {}))
    ScheduleRegistry.clear('test-task')
    const cron = ScheduleRegistry.get('test-task')
    expect(cron).toBeUndefined()
  })

  test('should be able to clear all cron jobs from the registry', async () => {
    ScheduleRegistry.add('test-task-1', new Cron('* * * * * *', async () => {}))
    ScheduleRegistry.add('test-task-2', new Cron('* * * * * *', async () => {}))
    ScheduleRegistry.clear()
    const list = ScheduleRegistry.all()
    expect(list).toBeDefined()
    expect(Object.keys(list).length).toBe(0)
  })
})
