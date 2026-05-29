import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react-native'],
    alias: {
      'emit-io-core': resolve(__dirname, 'packages/core/src/index.ts'),
      'emit-io-hono': resolve(__dirname, 'packages/hono/src/index.ts'),
      'emit-io-fastify': resolve(__dirname, 'packages/fastify/src/index.ts'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: [
      'packages/*/src/**/*.test.ts',
      'examples/hono-worker/src/**/*.test.ts',
      'examples/fastify-server/src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.test.ts', '**/dist/**', '**/bench/**'],
    },
  },
})
