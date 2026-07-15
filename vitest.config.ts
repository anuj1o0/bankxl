import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" path alias so parser modules can import
    // existing utilities (lib/normalize.ts etc.) the same way app code does.
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    include: ['lib/**/__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
  },
})
