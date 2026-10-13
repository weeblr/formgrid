import { execSync } from 'child_process';
import { setupTestDatabase, cleanupTestDatabase } from './db-setup';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'file:./test.db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.EMAIL_PROVIDER = 'console';
process.env.APP_URL = 'http://localhost:4000';

const testDbEnv = {
    ...process.env,
    TEST_DATABASE_URL: process.env.DATABASE_URL,
};

execSync('pnpm exec prisma generate --schema=prisma/test-schema.prisma', {
    stdio: 'inherit',
    env: testDbEnv,
});
execSync('pnpm exec prisma db push --schema=prisma/test-schema.prisma --accept-data-loss', {
    stdio: 'inherit',
    env: testDbEnv,
});

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    // Cleanup after all tests
    await cleanupTestDatabase();
});

// Global test utilities
export const testUtils = {
    // Generate test user data
    generateTestUser: () => ({
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123',
    }),

    // Wait for async operations
    wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};
