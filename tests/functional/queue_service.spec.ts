import { Logger, Queue } from '../../src/index.js'
import { Job } from '../../src/queue/contracts/job.js'
import { defineConfig } from '../../src/queue/define_config.js'

import { test } from '@japa/runner'
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import dotenv from 'dotenv'
import pDefer, { DeferredPromise } from 'p-defer'
import pino from 'pino'

dotenv.config()

const logger = pino({ transport: { target: 'pino-pretty' } })

let postgresContainer: StartedPostgreSqlContainer

// Simple mutex for testing async jobs
const jobMutexes = new Map<string, DeferredPromise<void>>()

function acquireMutex(key: string): void {
  jobMutexes.set(key, pDefer())
}

function releaseMutex(key: string): void {
  jobMutexes.get(key)?.resolve()
}

async function waitForMutex(key: string): Promise<void> {
  await jobMutexes.get(key)?.promise
}

class TestJob extends Job {
  public async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    logger.info({ payload }, 'Running test job...')
    releaseMutex('test-job')
  }
}

test.group('Worker queue', (group) => {
  let queue: Queue

  group.setup(async () => {
    // Start PostgreSQL container
    logger.debug('Starting PostgreSQL container...')
    postgresContainer = await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start()
    logger.debug('PostgreSQL container started')

    // Configure queue with container connection details
    const queueConfig = defineConfig({
      jobs: [TestJob],
      connection: 'test',
      connections: {
        test: {
          driver: 'postgres',
          queues: {
            default: { concurrency: 1 },
            'test-queue': { concurrency: 1 },
          },
          config: {
            host: postgresContainer.getHost(),
            port: postgresContainer.getPort(),
            user: postgresContainer.getUsername(),
            password: postgresContainer.getPassword(),
            database: postgresContainer.getDatabase(),
          },
        },
      },
    })

    // Create queue instance
    queue = new Queue({ ...queueConfig, logger: new Logger(logger) })
    Job.setDefaultQueueServiceResolver(() => Promise.resolve(queue))
  })

  group.teardown(async () => {
    // Stop the PostgreSQL container
    if (postgresContainer) {
      logger.debug('Stopping PostgreSQL container...')
      await postgresContainer.stop()
      logger.debug('PostgreSQL container stopped')
    }
  })

  group.each.setup(async () => {
    await queue.start()
  })

  group.each.teardown(async () => {
    await queue.stop()
  })

  test('should be able to dispatch a job onto any registered connection and queue', async ({}) => {
    // Acquire mutex before dispatching
    acquireMutex('test-job')

    await TestJob.dispatch({ arg1: 'hello', arg2: 1 })

    // Wait for job to complete (with timeout fallback)
    await Promise.race([
      waitForMutex('test-job'),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Job did not complete in time')),
          5000,
        ),
      ),
    ])
  }).timeout(10000)

  // test('should be able to schedule a recurring job', async ({}) => {
  //   // queue.schedule(new TestJob(), { arg1: 'hello', arg2: 1 }).every('* * * * *')

  //   await TestJob.schedule({ arg1: 'hello', arg2: 1 }).everyMinute()

  //   await new Promise((resolve) => setTimeout(resolve, 130000))

  //   // await TestJob.schedule({ arg1: 'hello', arg2: 1 }).every('3s')
  //   // await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
  //   //   .onConnection('test')
  //   //   .onQueue('default')
  //   //   .recurring(1000)
  // })

  // test('can dispatch a job without registering it first', async ({
  //   assert,
  // }) => {
  //   await queue.unregister(TestJob)

  //   await assert.doesNotReject(async () => {
  //     await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
  //   })

  //   await queue.register(TestJob)

  //   await assert.doesNotReject(async () => {
  //     await ScopedMutex.acquire('queue_service_test')
  //     await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
  //     await ScopedMutex.wait('queue_service_test')
  //   })
  // })

  // test('cannot dispatch a job on an non registered queue', async ({
  //   assert,
  // }) => {
  //   await assert.rejects(async () => {
  //     await TestJob.dispatch({ arg1: 'hello', arg2: 1 }).onQueue(
  //       // @ts-ignore
  //       'non-existent-queue',
  //     )
  //   }, new RegExp(`Queue 'non-existent-queue' is not registered`))
  // })

  // test('can dispatch a job on the default connection and queue', async ({
  //   assert,
  // }) => {
  //   await queue.register(TestJob)

  //   await assert.doesNotReject(async () => {
  //     await ScopedMutex.acquire('queue_service_test')
  //     await TestJob.dispatch({ arg1: 'hello', arg2: 1 })
  //     await ScopedMutex.wait('queue_service_test')
  //   })
  // })
})
