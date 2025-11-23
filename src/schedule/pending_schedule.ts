import {
  IntervalCronOptions,
  ScheduleInterval,
  ScheduleIntervalDayOfWeek,
  ScheduleIntervalTime,
  intervalToCron,
  parseTime,
} from './schedule_interval.js'
import { ScheduleRegistry } from './schedule_registry.js'
import { MaybePromise } from './types.js'

import type { LockFactory } from '@verrou/core'
import { Duration } from '@verrou/core/types'
import { Cron } from 'croner'
import { createHash } from 'node:crypto'

export const getDistributedLockKey = (name: string) => {
  const hash = createHash('sha1').update(name).digest('hex').slice(0, 8)
  return `lavoro:schedule:${hash}`
}

export class PendingSchedule {
  protected cronPattern?: string

  protected interval: ScheduleInterval = 'day'
  protected intervalOptions?: IntervalCronOptions

  protected distributedLockOptions: {
    /**
     * The lock key is based on the task name to ensure only one instance runs
     *
     * @param name - The task name
     * @returns The lock key
     */
    key: (name: string) => string
    /**
     * The lock TTL is the duration for which the lock is held
     */
    ttl: Duration
    /**
     * Whether to allow overlapping executions of the same task
     */
    overlap: boolean
  } = {
    key: getDistributedLockKey,
    ttl: '10s',
    overlap: false,
  }

  constructor(
    protected name: string,
    protected cb: () => MaybePromise<void>,
    protected lockServiceResolver: () => LockFactory,
  ) {}

  /**
   * Schedule using a cron pattern.
   * You can use https://crontab.guru to generate a cron pattern.
   *
   * @param pattern - Cron pattern string
   *
   * @example
   * Schedule.call('my-task', () => {}).cron('0 0 * * *')       // Daily at midnight
   * Schedule.call('my-task', () => {}).cron('*\/5 * * * *')    // Every 5 minutes
   * Schedule.call('my-task', () => {}).cron('0 *\/2 * * *')    // Every 2 hours
   */
  public cron(pattern: string): this {
    this.cronPattern = pattern
    return this
  }

  /**
   * Schedule to run at a specific interval.
   * For longer intervals (hour, day, week, etc.), you can customize when they run.
   *
   * @param interval - The schedule interval
   * @param options - Options to customize the cron pattern
   *
   * @example
   * Schedule.call('my-task', () => {}).every('minute')
   * Schedule.call('my-task', () => {}).every('hour', { minute: 30 })
   * Schedule.call('my-task', () => {}).every('day', { hour: 14, minute: 30 })
   * Schedule.call('my-task', () => {}).every('week', { dayOfWeek: 1, hour: 9 })
   */
  public every(
    interval: ScheduleInterval,
    options?: IntervalCronOptions,
  ): this {
    this.interval = interval
    this.intervalOptions = options
    this.cronPattern = intervalToCron(interval, options)
    return this
  }

  public on(dayOfWeek: ScheduleIntervalDayOfWeek): this {
    // .on() only makes sense for intervals larger than 'day'
    const valid: ScheduleInterval[] = [
      //
      'week',
      'month',
    ]

    if (!valid.includes(this.interval)) {
      throw new Error(
        `.on() can only be used for weekly intervals or larger. Current interval: '${this.interval}'`,
      )
    }

    this.intervalOptions = { ...(this.intervalOptions ?? {}), dayOfWeek }
    this.cronPattern = intervalToCron(this.interval, this.intervalOptions)
    return this
  }

  public at(time: ScheduleIntervalTime): this {
    // .at() only makes sense for intervals larger than 'hour'
    const valid: ScheduleInterval[] = [
      'day',
      'week',
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'month',
      'last day of month',
    ]

    if (!valid.includes(this.interval)) {
      throw new Error(
        `.at() can only be used for daily intervals or larger. Current interval: '${this.interval}'`,
      )
    }

    const [hour, minute] = parseTime(time)
    this.intervalOptions = { ...(this.intervalOptions ?? {}), hour, minute }
    this.cronPattern = intervalToCron(this.interval, this.intervalOptions)
    return this
  }

  /**
   * Set the duration during which other instances
   * of the same task will be prevented from running.
   *
   * This should be roughly the duration of the task execution or longer
   * since the lock will be released automatically after the task execution.
   *
   * @param ttl - The lock duration
   *
   * @example
   * Schedule.call('my-task', () => {}).lockFor('10s')
   */
  public lockFor(ttl: Duration): this {
    this.distributedLockOptions.ttl = ttl
    return this
  }

  /**
   * Allow overlapping executions of the same task.
   *
   * @example
   * Schedule.call('my-task', () => {}).overlapping()
   */
  public overlapping(): this {
    this.distributedLockOptions.overlap = true
    return this
  }

  protected async execute(): Promise<void> {
    if (!this.cronPattern) {
      throw new Error(
        'No schedule pattern defined. To schedule a task, set interval explicitly.',
      )
    }

    ScheduleRegistry.add(
      this.name,
      new Cron(this.cronPattern, async () => {
        // If overlapping is allowed, we can call the callback right away.
        if (this.distributedLockOptions.overlap) {
          await this.cb()
          return
        }

        // First, we create a distributed lock based on the task name,
        // which ensures that only one instance of the task runs at a time.
        const key = this.distributedLockOptions.key(this.name)
        const ttl = this.distributedLockOptions.ttl

        // Resolve lock service instance at execution time
        const lockService = this.lockServiceResolver()
        const lock = lockService.createLock(key, ttl)

        try {
          // Before running the task, we try to acquire the lock.
          const acquired = await lock.acquire()

          // If the lock was acquired, we run
          // the task and always release the lock.
          if (acquired) {
            try {
              await this.cb()
            } finally {
              await lock.release()
            }
          }

          // If the lock wasn't acquired, it means another
          // instance is running this task, so we skip it.
        } catch (error) {
          try {
            await lock.release()
          } finally {
            throw error
          }
        }
      }),
    )
  }

  /**
   * By defining the "then" method, PendingDispatch becomes "thenable",
   * allowing it to trigger automatically when await is called.
   */
  public async then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    // When await is called, actually execte pending chain.
    return this.execute().then(onfulfilled, onrejected)
  }
}
