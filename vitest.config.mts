import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: [
      'src/**/*.spec.ts',
      'test/**/*.spec.ts',
      'test/**/*.e2e-spec.ts',
    ],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.dto.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/index.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
    tsconfigPaths: true,
  },
});
