import { execSync } from 'child_process';

// Generate Prisma client for test database
export const setupTestDatabase = async (): Promise<void> => {
    try {
        // Generate Prisma client for test database
        execSync('pnpm exec prisma generate --schema=prisma/test-schema.prisma', {
            stdio: 'inherit',
            env: {
                ...process.env,
                TEST_DATABASE_URL: 'file:./test.db',
            },
        });

        // Push the schema to create the test database
        execSync('pnpm exec prisma db push --schema=prisma/test-schema.prisma --accept-data-loss', {
            stdio: 'inherit',
            env: {
                ...process.env,
                TEST_DATABASE_URL: 'file:./test.db',
            },
        });

        console.log('✅ Test database setup completed');
    } catch (error) {
        console.error('❌ Test database setup failed:', error);
        throw error;
    }
};

// Clean up test database
export const cleanupTestDatabase = async (): Promise<void> => {
    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: 'file:./test.db',
                },
            },
        });

        await prisma.attachment.deleteMany();
        await prisma.submission.deleteMany();
        await prisma.form.deleteMany();
        await prisma.apiKey.deleteMany();
        await prisma.profile.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();

        console.log('✅ Test database cleaned up');
    } catch (error) {
        console.error('❌ Test database cleanup failed:', error);
    }
};
