import { TestContext } from '../../helpers/test_context.js'

import { Job } from '@lavoro/core'
import { describe, expect, test } from 'vitest'

class TestJob extends Job {
  async handle(_payload: { test: string }) {}
}

describe('Queue lock provider (Memory)', () => {
  const ctx = new TestContext()

  ctx.setup([TestJob], 'memory')

  test.skip('should use memory lock provider for connection', async () => {
    const queue = ctx.getQueue()

    const driver = (queue as any).drivers.get('main')

    expect(driver).toBeDefined()

    // const tableName = (driver as any).lockTableName

    // const knexInstance = driver.lockKnexInstance as ReturnType<typeof knex>

    // const tables = await knexInstance('information_schema.tables')
    //   .select('table_name')
    //   .where('table_schema', 'public')
    //   .orderBy('table_name')

    // const tableNames = tables.map((t: any) => t.table_name)

    // expect(tableNames).toContain(tableName)

    // let locks = await knexInstance(tableName).select('*')
    // expect(locks.length).toBe(0)

    // const lockProvider = queue.getLockProvider('main')

    // const lock = lockProvider.createLock('test-lock', '2s')
    // const acquired = await lock.acquire()
    // expect(acquired).toBe(true)

    // locks = await knexInstance(tableName).select('*')
    // expect(locks.length).toBe(1)

    // const entry = locks[0]
    // expect(entry.key).toBe('test-lock')
    // expect(parseInt(entry.expiration)).toBeGreaterThan(Date.now())

    // await lock.release()

    // locks = await knexInstance(tableName).select('*')
    // expect(locks.length).toBe(0)
  })
})
