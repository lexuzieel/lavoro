import { MyJob } from '#jobs/my_job'
import { SendTildaFormRequest } from '#jobs/send_tilda_form_request'
import { defineConfig } from '#services/queue/define_config'
import {
  InferConnectionQueuesMap,
  InferConnections,
  InferDefaultConnection,
  InferQueueNames,
} from '#services/queue/types'
import env from '#start/env'

const queueConfig = defineConfig({
  jobs: [
    // Specify job classes here from app/jobs folder
    MyJob,
    SendTildaFormRequest,
  ],

  /*
  |--------------------------------------------------------------------------
  | Default connection
  |--------------------------------------------------------------------------
  |
  | The default queue connection to use for dispatching jobs
  |
  */
  connection: 'main',

  /*
  |--------------------------------------------------------------------------
  | Queue connections
  |--------------------------------------------------------------------------
  |
  | Define multiple queue connections. Each connection can have its own
  | driver (memory, postgres, etc) and its own set of queues.
  |
  */
  connections: {
    main: {
      driver: 'postgres',
      queues: {
        /*
        |--------------------------------------------------------------------------
        | Queue definitions
        |--------------------------------------------------------------------------
        |
        | Define queues for this connection with their options.
        | Each queue name maps to its QueueOptions (concurrency, etc.)
        |
        */
        default: {
          concurrency: 1,
        },
        'my-queue': {
          concurrency: 2,
        },
      },
      config: {
        host: env.get('QUEUE_POSTGRES_HOST', env.get('DB_HOST')),
        port: env.get('QUEUE_POSTGRES_PORT', env.get('DB_PORT', '5432')),
        user: env.get('QUEUE_POSTGRES_USER', env.get('DB_USER')),
        password: env.get(
          'QUEUE_POSTGRES_PASSWORD',
          env.get('DB_PASSWORD', ''),
        ),
        database: env.get('QUEUE_POSTGRES_DATABASE', env.get('DB_DATABASE')),
      },
    },
  },
})

export default queueConfig

declare module '#services/queue/types' {
  export interface QueueConnections
    extends InferConnections<typeof queueConfig> {}

  export interface DefaultConnection {
    name: InferDefaultConnection<typeof queueConfig>
  }
}

declare module '#services/queue/contracts/queue_driver' {
  export interface QueuesList
    extends Record<InferQueueNames<typeof queueConfig>, never> {}

  export interface ConnectionQueuesMap
    extends InferConnectionQueuesMap<typeof queueConfig> {}
}
