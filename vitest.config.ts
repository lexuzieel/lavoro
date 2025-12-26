import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@lavoro/core': new URL('./packages/core/src/index.ts', import.meta.url)
        .pathname,
      '@lavoro/memory': new URL(
        './packages/memory/src/index.ts',
        import.meta.url,
      ).pathname,
      '@lavoro/postgres': new URL(
        './packages/postgres/src/index.ts',
        import.meta.url,
      ).pathname,
    },
  },
})
