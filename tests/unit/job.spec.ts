import { Job } from '@lavoro/core'
import { describe, expect, test } from 'vitest'

class TestJob extends Job {
  async handle(_payload: unknown) {}
}

describe('Job', () => {
  test('must have a fully qualified job name', () => {
    const name = Job.compileName('test-queue', 'JobName_WithUnderscore')
    const { queue, name: jobName } = Job.parseName(name)
    expect(queue).toBe('test-queue')
    expect(jobName).toBe('JobName_WithUnderscore')
  })

  test('throws error when getting fully qualified name without queue set', () => {
    const job = new TestJob()
    expect(() => job.fullyQualifiedName).toThrow('Queue is not set.')
  })
})
