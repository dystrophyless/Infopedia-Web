import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/features/**/*.test.ts',
      'src/features/**/*.test.tsx',
      'src/api/**/*.test.ts',
    ],
    passWithNoTests: false,
  },
});
