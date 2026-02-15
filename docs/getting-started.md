# Get Started

It is simple to start using Lavoro: you install the package for the driver you
want to use, then you create and start a Lavoro instance with a configuration.

## Installation

Each driver is a separate package. Install the one you need:

### PostgreSQL

```bash
npm install @lavoro/postgres
```

### Memory

```bash
npm install @lavoro/memory
```

::: info

Memory queue driver is useful during development and testing because you don't
need to bring up a database. You can also use it in production on a single
instance if you don't need persistence.

:::

## Creating the queue

Unlike other libraries, in Lavoro you don't have to create and manage queues
separately. Instead, you create one Lavoro instance, bind jobs to it, and
start it. Lavoro handles queue management automatically based on your config.

::: tip

For more detailed instructions on how to configure multiple queues and
connections, check out the [Configuration](/configuration) section.

:::

### Step 1. Define configuration

```ts
// config/lavoro.ts
import { Inspire } from '../jobs/Inspire'

import {
  type InferConnectionQueues,
  type InferConnections,
  type InferDefaultConnection,
  type InferQueueNames,
  defineConfig,
} from '@lavoro/core'
import { memory } from '@lavoro/memory'

const config = {
  // Define jobs to be dispatched and processed.
  jobs: [Inspire],

  // Whether this instance should act as a worker or not.
  worker: true,

  // Specify the default connection.
  connection: 'main',

  // Each connection specifies a driver and a list of queues and their config.
  connections: {
    main: {
      driver: memory(),
      queues: {
        default: {
          concurrency: 1,
        },
      },
    },
  },
} as const

// We define configuration object and initialize it separately
// in order for the TypeScript type checking to work properly.
const lavoroConfig = defineConfig(config)

/*
 * Don't worry about this part — it just enables
 * TypeScript autocomplete for queue/connection names.
 * Copy-paste as-is and forget about it.
 */
declare module '@lavoro/core' {
  interface QueueList extends InferQueueNames<typeof config> {}
  interface DefaultConnection {
    name: InferDefaultConnection<typeof config>
  }
  interface QueueConnections extends InferConnections<typeof config> {}
  interface ConnectionQueues extends InferConnectionQueues<typeof config> {}
}

export default lavoroConfig
```

### Step 2. Initialize the instance

```ts
import lavoroConfig from '../config/lavoro'

import { Job, Logger, Queue } from '@lavoro/core'
import pino from 'pino'

/*
 * We can use any custom logger.
 * In this case we use pino logger
 * through the built-in logger adapter.
 */
export const logger = new Logger(pino())

/*
 * We create a new instance with
 * the configuration and pass our custom logger.
 */
const lavoro = new Queue({ ...lavoroConfig, logger })

/*
 * This tells all jobs to use this Lavoro instance by default
 * when you call Job.dispatch() anywhere in your app.
 */
Job.setDefaultQueueServiceResolver(async () => lavoro)
```

## Starting the queue

Now you can start the instance you can call the `start` method:

```ts
await lavoro.start()
```

Typically, you would do this in the entrypoint to your application. If you are
using a framework with a service container, then you can define it as a separate
service that boots on application start.

In a simple Node.js application you can do something like this:

```ts
const main = async () => {
  await lavoro.start()
  logger.info('Lavoro started')
}

await main()

// Keep process alive indefinitely
// (in real apps, your HTTP server or framework does this)
setInterval(() => {}, 1 << 30)
```

Lavoro supports graceful shutdown which waits for the jobs to finish before
exiting the application. This prevents the worker from being terminated while it
is processing a job. For this you can use the `stop` method:

```ts
await lavoro.stop({
  graceful: true, // This is `true` by default
  timeout: 30000, // Timeout in milliseconds (30 seconds by default)
})
```

In your application, you can add signal handlers to trigger graceful shutdown:

```ts
const shutdown = async () => {
  logger.info('Stopping Lavoro instance...')
  await lavoro.stop()
  logger.info('Lavoro stopped')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

::: tip

Complete working example of a basic Node.js application with memory driver can
be found here: https://github.com/lexuzieel/lavoro-nodejs-example

:::

## Using the queue

After you start the instance, at any point in your application you can dispatch
a job using the static `dispatch` method:

```ts
await Inspire.dispatch({ quote: 'Inspiring quote' })
```

It will automatically be dispatched to the default queue on the default
connection. In our case that would be `default` queue on the `main` connection.

You can also dispatch a job to a specific queue on the default connection:

```ts
await Inspire.dispatch({ quote: 'Inspiring quote' }).onQueue('custom-queue')
```

Or you can specify a different connection:

```ts
await Inspire.dispatch({ quote: 'Inspiring quote' })
  .onConnection('alternative')
  .queue('high-thoughput')
```

The jobs automatically "know" which Lavoro instance to use since we have
specified it using `Job.setDefaultQueueServiceResolver()`.

---

Besides dispatching jobs manually, you can also schedule them like so:

```ts
await Schedule.job(Inspire, {
  quote: 'Inspiring quote',
}).every('second')
```

All of the methods from `Job.dispatch` can be used for scheduling as well, such
as `onConnection` and `onQueue`.

For more details on scheduling jobs, check out the [scheduling](#) section.
