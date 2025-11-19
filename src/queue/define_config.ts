import { Job } from './contracts/job.js'
import type { QueueConnectionsList } from './types.js'

/**
 * Define config for queue service
 */
export function defineConfig<
  Connections extends QueueConnectionsList,
  Connection extends keyof Connections = keyof Connections,
>(config: {
  jobs: (new () => Job)[]
  connection: Connection
  connections: Connections
}): {
  jobs: (new () => Job)[]
  connection: Connection
  connections: Connections
} {
  return config
}
