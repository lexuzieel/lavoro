import { TestContext } from '../../helpers/test_context.js'

import { Job } from '@lavoro/core'
import knex from 'knex'
import { describe, expect, test } from 'vitest'

// import { LockFactory } from '@verrou/core'
// import { knexStore } from '@verrou/core/drivers/knex'
// import knex from 'knex'
// import { afterEach, beforeEach, describe, expect, test } from 'vitest'

class TestJob extends Job {
  async handle(_payload: { test: string }) {}
}

describe('Queue lock provider (PostgreSQL)', () => {
  const ctx = new TestContext()

  ctx.setup([TestJob], 'postgres')

  test('should use postgres lock provider for connection', async () => {
    const queue = ctx.getQueue()

    const driver = (queue as any).drivers.get('main')
    const tableName = (driver as any).lockTableName

    const knexInstance = driver.lockKnexInstance as ReturnType<typeof knex>

    const tables = await knexInstance('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .orderBy('table_name')

    const tableNames = tables.map((t: any) => t.table_name)

    expect(tableNames).toContain(tableName)

    let locks = await knexInstance(tableName).select('*')
    expect(locks.length).toBe(0)

    const lockProvider = queue.getLockProvider('main')

    const lock = lockProvider.createLock('test-lock', '2s')
    const acquired = await lock.acquire()
    expect(acquired).toBe(true)

    locks = await knexInstance(tableName).select('*')
    expect(locks.length).toBe(1)

    const entry = locks[0]
    expect(entry.key).toBe('test-lock')
    expect(parseInt(entry.expiration)).toBeGreaterThan(Date.now())

    await lock.release()

    locks = await knexInstance(tableName).select('*')
    expect(locks.length).toBe(0)
  })
})
//   const ctx = new TestContext()
//   let queue: Queue
//   let lockProvider: LockFactory
//   let knexInstance: any

//   beforeEach(async () => {
//     // Setup queue which will start the Postgres container
//     await ctx.setupQueue([TestJob], 'postgres')

//     // Get the postgres config from the container
//     const postgresContainer = ctx.getPostgres()
//     const postgresConfig = {
//       host: postgresContainer.getHost(),
//       port: postgresContainer.getPort(),
//       user: postgresContainer.getUsername(),
//       password: postgresContainer.getPassword(),
//       database: postgresContainer.getDatabase(),
//     }

//     // Create Knex instance for Postgres
//     knexInstance = knex({
//       client: 'pg',
//       connection: {
//         host: postgresConfig.host,
//         port: Number(postgresConfig.port),
//         user: postgresConfig.user,
//         password: postgresConfig.password,
//         database: postgresConfig.database,
//       },
//     })

//     // Create a Postgres-based lock provider using Knex
//     lockProvider = new LockFactory(
//       knexStore({
//         connection: knexInstance,
//         autoCreateTable: true,
//       }).factory(),
//     )

//     // Stop the default queue and create a new one with lock service
//     await ctx.stopQueue()

//     const queueConfig = defineConfig({
//       jobs: [TestJob],
//       connection: 'main',
//       connections: {
//         main: {
//           driver: 'postgres',
//           config: postgresConfig,
//           queues: {
//             default: { concurrency: 1 },
//           },
//           lockProvider: lockProvider,
//         },
//       },
//     })

//     queue = new Queue(queueConfig)
//     Job.setDefaultQueueServiceResolver(() => Promise.resolve(queue))
//     await queue.start()
//   })

//   afterEach(async () => {
//     await queue.stop()
//     await ctx.teardownPostgres()
//   })

//   test('should use postgres lock service from connection config', () => {
//     // Verify the lock provider is configured
//     const connectionLockProvider = queue.getLockProvider('main')
//     expect(connectionLockProvider).toBeDefined()
//     expect(connectionLockProvider).toBe(lockProvider)
//   })

//   test('should use connection lock service for scheduled jobs', async () => {
//     let executionCount = 0

//     // Schedule a job that uses the main connection
//     const jobInstance = new TestJob()
//     const scheduledJob = Schedule.job(TestJob, { test: 'hello' })
//       .onConnection('main')
//       .onQueue('default')
//       .every('second')

//     // TODO: This test doesn't make sense

//     // Before executing, the job should use the default lock service resolver
//     const defaultResolver = (Schedule as any).defaultLockProviderResolver
//     expect(defaultResolver).toBeDefined()

//     // Execute the schedule (this will set up the cron job)
//     await scheduledJob

//     // Wait a bit to let the job execute
//     await new Promise((resolve) => setTimeout(resolve, 1500))

//     // The job should have been registered with the queue
//     const scheduledJobs = (queue as any).scheduledJobs
//     expect(scheduledJobs.size).toBeGreaterThan(0)

//     // Clean up
//     Schedule.clear(jobInstance.id)
//   })

//   test('should handle lock acquisition and release', async () => {
//     // Create a lock directly using the postgres lock provider
//     const lock = lockProvider.createLock('test-lock', '2s')

//     // Acquire the lock
//     const acquired = await lock.acquire()
//     expect(acquired).toBe(true)

//     // Try to acquire again with same owner (should succeed - same lock instance)
//     const acquired2 = await lock.acquire()
//     expect(acquired2).toBe(true)

//     // Release the lock
//     await lock.release()

//     // Now create a new lock and acquire it
//     const lock2 = lockProvider.createLock('test-lock-2', '2s')
//     const acquired3 = await lock2.acquire()
//     expect(acquired3).toBe(true)

//     await lock2.release()
//   })

//   test('should use postgres lock service for scheduled tasks', async () => {
//     let executionCount = 0
//     const taskName = 'postgres-lock-test'

//     // Override the default lock service resolver to use our postgres lock provider
//     Schedule.setLockProviderResolver(() => lockProvider)

//     // Schedule a task
//     await Schedule.call(taskName, async () => {
//       executionCount++
//     }).cron('* * * * * *')

//     // Wait for execution
//     await new Promise((resolve) => setTimeout(resolve, 1500))

//     // Task should have executed at least once
//     expect(executionCount).toBeGreaterThan(0)

//     // Clean up
//     Schedule.clear(taskName)
//   })

//   test('should work with multiple connections having different lock services', async () => {
//     // Stop the current queue
//     await queue.stop()

//     // Get postgres config
//     const postgresContainer = (ctx as any).postgresContainer
//     const postgresConfig = {
//       host: postgresContainer.getHost(),
//       port: postgresContainer.getPort(),
//       user: postgresContainer.getUsername(),
//       password: postgresContainer.getPassword(),
//       database: postgresContainer.getDatabase(),
//     }

//     const knexInstance1 = knex({
//       client: 'pg',
//       connection: postgresConfig,
//     })

//     const knexInstance2 = knex({
//       client: 'pg',
//       connection: postgresConfig,
//     })

//     const lockProvider1 = new LockFactory(
//       knexStore({
//         connection: knexInstance1,
//         autoCreateTable: true,
//       }).factory(),
//     )

//     const lockProvider2 = new LockFactory(
//       knexStore({
//         connection: knexInstance2,
//         autoCreateTable: true,
//       }).factory(),
//     )

//     // Configure queue with two connections, each with its own lock provider
//     const queueConfig = defineConfig({
//       jobs: [TestJob],
//       connection: 'main',
//       connections: {
//         main: {
//           driver: 'postgres',
//           config: postgresConfig,
//           queues: {
//             default: { concurrency: 1 },
//           },
//           lockProvider: lockProvider1,
//         },
//         alternative: {
//           driver: 'postgres',
//           config: postgresConfig,
//           queues: {
//             default: { concurrency: 1 },
//           },
//           lockProvider: lockProvider2,
//         },
//       },
//     })

//     queue = new Queue(queueConfig)
//     Job.setDefaultQueueServiceResolver(() => Promise.resolve(queue))
//     await queue.start()

//     // Verify each connection has its own lock provider
//     const mainLockProvider = queue.getLockProvider('main')
//     const alternativeLockProvider = queue.getLockProvider('alternative')

//     expect(mainLockProvider).toBe(lockProvider1)
//     expect(alternativeLockProvider).toBe(lockProvider2)
//     expect(mainLockProvider).not.toBe(alternativeLockProvider)

//     // Get database structure (tables)
//     const tables = await knexInstance1('information_schema.tables')
//       .select('table_name')
//       .where('table_schema', 'public')
//       .orderBy('table_name')

//     const tableNames = tables.map((t) => t.table_name)

//     console.log(tableNames)

//     // select * from lavoro_locks
//     const locks = await knexInstance1('lavoro_locks').select('*')
//     console.log({ locks })

//     // select * from verrou
//     const verrou = await knexInstance1('verrou').select('*')
//     console.log({ verrou })

//     // Verify we have tables and at least one lock-related table
//     expect(tableNames.length).toBeGreaterThan(0)
//     const hasLockTable = tableNames.some((name) => name.includes('lock'))
//     expect(hasLockTable).toBe(true)

//     // Database structure is available in tableNames variable
//     expect(tableNames).toBeDefined()

//     // Cleanup
//     await knexInstance1.destroy()
//     await knexInstance2.destroy()
//   })
// })
