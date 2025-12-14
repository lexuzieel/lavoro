import type { QueueConfig, QueueConnectionsList } from './types.js'

import { RuntimeException } from '@poppinss/utils'

type QueueConfigWithConnections<Connections, Connection> = QueueConfig & {
  connection: Connection
  connections: Connections
}

/**
 * Define config for queue service.
 *
 * @example
 * ```ts
 * // config/queue.ts
 * import { memory } from '@lavoro/memory'
 * import { postgres } from '@lavoro/postgres'
 *
 * const config = {
 *   jobs: [...],
 *   connection: 'main',
 *   connections: {
 *     main: {
 *       driver: memory(),
 *       queues: {
 *         default: { concurrency: 1 },
 *         emails: { concurrency: 3 },
 *       },
 *     },
 *     background: {
 *       driver: postgres({ ... }),
 *       queues: {
 *         'heavy-tasks': { concurrency: 2 },
 *         reports: { concurrency: 1 },
 *       },
 *     },
 *   },
 * }
 *
 * const queueConfig = defineConfig(config)
 *
 * // Type augmentation to enable type-safe queue names
 * declare module '@lavoro/core' {
 *   interface QueueList extends InferQueueNames<typeof config> {}
 *   interface DefaultConnection {
 *     name: InferDefaultConnection<typeof config>
 *   }
 *   interface QueueConnections extends InferConnections<typeof config> {}
 *   interface ConnectionQueues extends InferConnectionQueues<typeof config> {}
 * }
 * ```
 *
 * After defining your queue names, you'll get autocomplete and type checking:
 * ```ts
 * await queue.listen('emails')        // ✓ Valid
 * await queue.listen('heavy-tasks')   // ✓ Valid
 * await queue.listen('invalid')       // ✗ Type error
 *
 * await job.dispatch(payload).onQueue('emails')  // ✓ Valid
 * await job.dispatch(payload).onQueue('typo')    // ✗ Type error
 * ```
 */
export function defineConfig<
  const Connections extends QueueConnectionsList,
  const Connection extends keyof Connections = keyof Connections,
>(
  config: QueueConfigWithConnections<Connections, Connection>,
): QueueConfigWithConnections<Connections, Connection> {
  // Validate required fields
  if (!config.connection) {
    throw new RuntimeException(
      'Missing "connection" property in queue config file',
    )
  }

  if (!config.connections) {
    throw new RuntimeException(
      'Missing "connections" property in queue config file',
    )
  }

  // Validate default connection exists
  if (!config.connections[config.connection as string]) {
    throw new RuntimeException(
      `Missing "connections.${String(config.connection)}". It is referenced by the "connection" property`,
    )
  }

  // Validate each connection has queues
  Object.keys(config.connections).forEach((connectionName) => {
    const connection =
      config.connections[connectionName as keyof typeof config.connections]
    if (!connection.queues || Object.keys(connection.queues).length === 0) {
      throw new RuntimeException(
        `Connection "${connectionName}" must have at least one queue defined`,
      )
    }
  })

  return config
}
