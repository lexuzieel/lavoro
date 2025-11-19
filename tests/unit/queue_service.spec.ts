import { Job } from '../../src/queue/contracts/job.js'

import { test } from '@japa/runner'

test.group('Worker queue job', () => {
  test('must have a fully qualified job name', async ({ assert }) => {
    const name = Job.compileName('test-queue', 'JobName_WithUnderscore')
    const { queue, name: jobName } = Job.parseName(name)
    assert.equal(queue, 'test-queue')
    assert.equal(jobName, 'JobName_WithUnderscore')
  })
})
