import { Job } from './contracts/job.js'
import { QueueDriver, QueueDriverConfig } from './contracts/queue_driver.js'

import type { LockFactory } from '@verrou/core'

export type WorkerOptions = {
  concurrency?: number
}

/**
 * Constructor type for an abstract QueueDriver
 * that accepts optional driver-specific config.
 */
type QueueDriverConstructor<Driver extends QueueDriver = QueueDriver> = new (
  config: QueueConfig,
  queues: Record<string, WorkerOptions>,
  driverConfig?: any,
) => Driver

/**
 * Driver descriptor that combines both the driver and its config.
 * This is used by builder functions like postgres() and memory().
 */
export type ConfiguredDriver<
  Driver extends QueueDriver = QueueDriver,
  Config extends QueueDriverConfig = QueueDriverConfig,
> = {
  constructor: QueueDriverConstructor<Driver>
  config?: Config
}

/**
 * Configuration for a specific queue connection.
 */
export type QueueConnectionConfig<
  Driver extends QueueDriver = QueueDriver,
  Queues extends Record<string, WorkerOptions> = Record<string, WorkerOptions>,
> = {
  driver: ConfiguredDriver<Driver>
  queues: Queues
  lockProvider?: LockFactory
}

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
 */
export interface DefaultConnection {}

/**
 * List of registered queue connections
 * and their related driver configuration.
 */
export type QueueConnectionsList = Record<
  string,
  QueueConnectionConfig<QueueDriver>
>

/**
 * Possible connection names using keys from augmented QueueConnections.
 *
 * If QueueConnections is not augmented, defaults to string.
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
  ? Connections extends Record<string, { queues: Record<string, any> }>
    ? {
        [K in {
          [CK in keyof Connections]: keyof Connections[CK]['queues']
        }[keyof Connections]]: never
      }
    : never
  : never

/**
 * Infer queue names for a specific connection
 */
export type InferQueueNamesForConnection<
  T,
  ConnectionName extends string,
> = T extends { connections: infer Connections }
  ? Connections extends Record<string, { queues: Record<string, any> }>
    ? ConnectionName extends keyof Connections
      ? keyof Connections[ConnectionName]['queues']
      : never
    : never
  : never

/**
 * Infer the connection-to-queues mapping from the config
 * Returns a mapped type where each connection name maps to its queue names
 */
export type InferConnectionQueues<T> = T extends {
  connections: infer Connections
}
  ? Connections extends Record<string, { queues: Record<string, any> }>
    ? {
        [K in keyof Connections]: keyof Connections[K]['queues']
      }
    : never
  : never
