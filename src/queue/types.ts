import { Job } from './contracts/job.js'

import type { LockFactory } from '@lavoro/verrou'

export type WorkerOptions = {
  concurrency?: number
}

/**
 * Base configuration shared by all connections
 */
type BaseQueueConnectionConfig<
  Queues extends Record<string, WorkerOptions> = Record<string, WorkerOptions>,
> = {
  /**
   * List of queue names with their options for this connection
   */
  queues: Queues

  /**
   * Optional lock provider (LockFactory instance) for distributed locking.
   *
   * If not provided, a lock provider will be automatically created
   * based on the connection driver.
   */
  lockProvider?: LockFactory
}

/**
 * Memory driver configuration
 */
export type MemoryQueueConnectionConfig<
  Queues extends Record<string, WorkerOptions> = Record<string, WorkerOptions>,
> = BaseQueueConnectionConfig<Queues> & {
  driver: 'memory'
}

/**
 * Postgres driver configuration powered by pg-boss
 */
export type PostgresQueueConnectionConfig<
  Queues extends Record<string, WorkerOptions> = Record<string, WorkerOptions>,
> = BaseQueueConnectionConfig<Queues> & {
  driver: 'postgres'
  config: {
    host: string
    port: string | number
    user: string
    password: string
    database: string
  }
}

export type QueueConnectionConfig =
  | MemoryQueueConnectionConfig
  | PostgresQueueConnectionConfig

export type QueueDriverType =
  | MemoryQueueConnectionConfig['driver']
  | PostgresQueueConnectionConfig['driver']

/**
 * Interface to be augmented by users to define their connection names.
 * This enables type-safe connection names throughout the application.
 *
 * Each key should be a connection name mapped to the connection's configuration type.
 *
 * Usage in config files:
 * ```ts
 * declare module 'lavoro' {
 *   export interface QueueConnections
 *     extends InferConnections<typeof queueConfig> {}
 * }
 * ```
 */
export interface QueueConnections {}

/**
 * Interface to be augmented by users to define their default connection.
 * This is used to provide correct type hints when no explicit connection is specified.
 *
 * Usage in config files:
 * ```ts
 * declare module 'lavoro' {
 *   export interface DefaultConnection {
 *     name: InferDefaultConnection<typeof queueConfig>
 *   }
 * }
 * ```
 */
export interface DefaultConnection {}

/**
 * List of registered queue connections
 * Defaults to a generic record if no connections are defined
 */
export type QueueConnectionsList = Record<string, QueueConnectionConfig>

/**
 * Possible connection names - extracts keys from augmented QueueConnections interface
 * If QueueConnections is not augmented, defaults to string
 */
export type QueueConnectionName = keyof QueueConnections extends never
  ? string
  : keyof QueueConnections

/**
 * Queue service configuration
 */
export type QueueConfig = {
  jobs: readonly (new () => Job)[]
  worker?: boolean
  connection: QueueConnectionName
  connections: QueueConnectionsList
}

/**
 * Infer connection names from the config
 */
export type InferConnections<T> = T extends { connections: infer Connections }
  ? Connections
  : never

/**
 * Infer the default connection name from the config
 */
export type InferDefaultConnection<T> = T extends {
  connection: infer Connection
}
  ? Connection
  : never

/**
 * Infer queue names from all connections
 */
export type InferQueueNames<T> = T extends { connections: infer Connections }
  ? Connections extends QueueConnectionsList
    ? {
        [K in keyof Connections]: keyof Connections[K]['queues']
      }[keyof Connections]
    : never
  : never

/**
 * Infer queue names for a specific connection
 */
export type InferQueueNamesForConnection<
  T,
  ConnectionName extends string,
> = T extends { connections: infer Connections }
  ? Connections extends QueueConnectionsList
    ? ConnectionName extends keyof Connections
      ? keyof Connections[ConnectionName]['queues']
      : never
    : never
  : never

/**
 * Infer the connection-to-queues mapping from the config
 * Returns a mapped type where each connection name maps to its queue names
 */
export type InferConnectionQueuesMap<T> = T extends {
  connections: infer Connections
}
  ? Connections extends QueueConnectionsList
    ? {
        [K in keyof Connections]: keyof Connections[K]['queues']
      }
    : never
  : never
