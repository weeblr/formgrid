import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export const getTestPrisma = (): PrismaClient => {
    if (!prisma) {
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: 'file:./test.db',
                },
            },
        });
    }
    return prisma;
};

export const resetDatabase = async (): Promise<void> => {
    const testPrisma = getTestPrisma();

    // Delete in correct order due to foreign key constraints
    await testPrisma.attachment.deleteMany();
    await testPrisma.submission.deleteMany();
    await testPrisma.form.deleteMany();
    await testPrisma.apiKey.deleteMany();
    await testPrisma.profile.deleteMany();
    await testPrisma.user.deleteMany();
};

export const closeTestDatabase = async (): Promise<void> => {
    if (prisma) {
        await prisma.$disconnect();
    }
};
