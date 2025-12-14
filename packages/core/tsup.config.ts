import { defineConfig } from 'tsup'

export const config = defineConfig({
  clean: true,
  format: 'esm',
  dts: {
    resolve: true,
  },
  target: 'es2015',
  sourcemap: true,
  entry: ['./src/index.ts'],
  outDir: './build',
})

export default config
