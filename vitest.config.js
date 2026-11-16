import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Los tests de controladores mockean Prisma; no deben tocar una base real.
    restoreMocks: true,
  },
});
