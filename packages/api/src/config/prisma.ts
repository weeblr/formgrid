import { PrismaClient } from '@prisma/client';

// Global variable to store Prisma client instance
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance
const createPrismaClient = (): PrismaClient => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'minimal', // [weeblr] No query details in error messages
    });
};

// Singleton pattern for Prisma client
// In development, use global variable to prevent multiple instances
// In production, create new instance each time
const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV === 'development') {
    globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

// Export the Prisma client instance
export { prisma };

// Export default
export default prisma;
