import type { QueueConfig, QueueConnectionsList } from './types.js'

type QueueConfigWithConnections<Connections, Connection> = QueueConfig & {
  connection: Connection
  connections: Connections
}

/**
 * Define config for queue service
 */
export function defineConfig<
  const Connections extends QueueConnectionsList,
  const Connection extends keyof Connections = keyof Connections,
>(
  config: QueueConfigWithConnections<Connections, Connection>,
): QueueConfigWithConnections<Connections, Connection> {
  return config
}
