import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './build',
  clean: true,
  format: 'esm',
  dts: true,
  target: 'es2015',
  sourcemap: true,
})
