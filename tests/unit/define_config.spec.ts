import { defineConfig, memory, postgres } from '../../src/index.js'

import { describe, test } from 'vitest'

describe('DefineConfig', () => {
  test('should accept postgres driver with required config', async () => {
    defineConfig({
      jobs: [],
      connection: 'main',
      connections: {
        main: {
          driver: postgres({
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'postgres',
            database: 'test',
          }),
          queues: {
            default: {},
          },
        },
      },
    })
  })

  test('should accept memory driver without config', async () => {
    defineConfig({
      jobs: [],
      connection: 'main',
      connections: {
        main: {
          driver: memory(),
          queues: {
            default: {},
          },
        },
      },
    })
  })

  test('should accept memory driver with optional config', async () => {
    defineConfig({
      jobs: [],
      connection: 'main',
      connections: {
        main: {
          driver: memory({}),
          queues: {
            default: {},
          },
        },
      },
    })
  })
})
