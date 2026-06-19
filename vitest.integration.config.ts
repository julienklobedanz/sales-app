import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    name: 'integration',
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['./tests/integration/vitest.setup.ts'],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
})
