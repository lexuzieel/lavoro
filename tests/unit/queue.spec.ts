import { Job } from '../../src/queue/contracts/job.js'
import { defineConfig } from '../../src/queue/define_config.js'
import { Queue } from '../../src/queue/queue.js'

import { describe, expect, test } from 'vitest'

class DummyJob extends Job {
  async handle(_payload: { value: number }) {}
}

describe('Queue', () => {
  test('throws error when enqueueing to non-existent connection', async () => {
    const config = defineConfig({
      jobs: [DummyJob],
      connection: 'memory',
      connections: {
        memory: { driver: 'memory', queues: { default: { concurrency: 1 } } },
      },
    })
    const queue = new Queue(config)

    const job = new DummyJob()
    job.options.connection = 'non-existent' as any

    await expect(queue.enqueue(job, { value: 1 })).rejects.toThrow(
      'No driver found for connection: non-existent',
    )
  })
})
