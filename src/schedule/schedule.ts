import { Job, Payload, PayloadWithLock } from '../queue/contracts/job.js'
import { MaybePromise } from '../types.js'
import { PendingJobSchedule } from './pending_job_schedule.js'
import { PendingSchedule } from './pending_schedule.js'
import { ScheduleRegistry } from './schedule_registry.js'

import { LockFactory } from '@lavoro/verrou'
import { memoryStore } from '@lavoro/verrou/drivers/memory'

/**
 * Default lock provider instance for distributed locking.
 * Uses memory store by default.
 */
export const defaultScheduleLockProvider = new LockFactory(
  memoryStore().factory(),
)

export class Schedule {
  /**
   * Default lock provider resolver for distributed locking.
   * Returns the default memory-based instance if not overridden.
   */
  private static defaultLockProviderResolver: () => LockFactory = () =>
    defaultScheduleLockProvider

  /**
   * Set a custom lock provider resolver for distributed locking.
   *
   * This allows dynamic resolution of lock provider instances, useful when
   * integrating with Queue or other services that manage lock instances.
   *
   * @param resolver - Function that returns a LockFactory instance
   *
   * @example
   * import { LockFactory } from '@verrou/core'
   * import { redisStore } from '@verrou/core/drivers/redis'
   *
   * const customLockProvider = new LockFactory(
   *   redisStore({ connection: redisClient })
   * )
   *
   * Schedule.setLockProviderResolver(() => customLockProvider)
   */
  public static setLockProviderResolver(resolver: () => LockFactory): void {
    this.defaultLockProviderResolver = resolver
  }

  /**
   * Get the current lock provider instance from the resolver.
   * @internal
   */
  public static getLockProvider(): LockFactory {
    return this.defaultLockProviderResolver()
  }

  /**
   * Clear all scheduled tasks (or specific one if name is specified).
   *
   * @param name - The name of the task to clear
   *
   * @example
   * Schedule.clear() // Clear all tasks
   * Schedule.clear('my-task') // Clear specific task
   */
  public static clear(name?: string): void {
    if (name) {
      ScheduleRegistry.clear(name)
    } else {
      Object.keys(ScheduleRegistry.all()).forEach((name) =>
        ScheduleRegistry.clear(name),
      )
    }
  }

  /**
   * Schedule a callback to run at specified intervals.
   *
   * @param name - Unique identifier for the task (required for distributed systems)
   * @param cb - The callback function to execute
   *
   * @example
   * // Using cron pattern
   * const cleanupUsers = async () => { ... }
   * Schedule.call('cleanup-users', cleanupUsers).cron('0 0 * * *')
   *
   * // Using convenience methods
   * Schedule.call('hourly-task', () => { ... }).hourly()
   * Schedule.call('daily-task', () => { ... }).daily()
   */
  public static call(name: string, cb: () => MaybePromise<void>) {
    return new PendingSchedule(name, cb, this.defaultLockProviderResolver)
  }

  /**
   * Schedule a job to run at specified intervals.
   *
   * You can specify the connection and queue to use for the job
   * the same way you would dispatch a job.
   *
   * @param job - The job class to schedule
   * @param payload - The payload to pass to the job
   *
   * @example
   * Schedule.job(TestJob, { arg1: 'hello', arg2: 1 }).every('minute')
   * Schedule.job(TestJob, { arg1: 'hello', arg2: 1 })
   *   .onConnection('main')
   *   .onQueue('default')
   *   .every('minute')
   */
  public static job<T extends Job, P extends Payload<T>>(
    job: new () => T,
    payload: P,
  ): PendingJobSchedule<T, P> {
    return new PendingJobSchedule<T, P>(
      new job(),
      payload as PayloadWithLock<T, P>,
      this.defaultLockProviderResolver,
    )
  }
}
