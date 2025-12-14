import { config } from '../core/tsup.config.js'

export default {
  ...config,
  entry: ['./src/index.ts'],
  outDir: './build',
}
