import { PrismaClient, Submission } from '@prisma/client';
import { prisma } from '../config/prisma';
import { SubmissionNotFoundError } from './submission.errors';

/**
 * Submission repository for database operations
 * Handles submission-specific database queries
 */
export class SubmissionRepository {
    private prisma: PrismaClient;

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || prisma;
    }

    /**
     * Create a new submission
     * @param data - Submission creation data
     * @returns Promise<Submission> - The created submission
     */
    async create(data: {
        formId: string;
        userId?: string;
        payload: any;
        name?: string;
        email?: string;
        ip?: string;
        userAgent?: string;
        status?: string;
    }): Promise<Submission> {
        return this.prisma.submission.create({
            data: {
                formId: data.formId,
                userId: data.userId || null,
                payload: data.payload,
                name: data.name || null,
                email: data.email || null,
                ip: data.ip || null,
                userAgent: data.userAgent || null,
                status: data.status || 'new',
            },
        });
    }

    /**
     * Find a submission by its ID
     * @param id - The submission ID to search for
     * @returns Promise<Submission | null> - The submission if found, null otherwise
     */
    async findById(id: string): Promise<Submission | null> {
        return this.prisma.submission.findUnique({
            where: { id },
            include: {
                form: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
                attachments: true,
            },
        });
    }

    /**
     * Find a submission by ID only if its parent form is owned by the user.
     * Authorization uses Form.userId, not Submission.userId (public submissions are null).
     */
    async findByIdForOwner(id: string, ownerUserId: string): Promise<Submission | null> {
        return this.prisma.submission.findFirst({
            where: {
                id,
                form: { userId: ownerUserId },
            },
            include: {
                form: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
                attachments: true,
            },
        });
    }

    /**
     * Find all submissions for a specific form
     * @param formId - The form ID to search for
     * @param page - Page number (1-based)
     * @param limit - Number of items per page
     * @returns Promise<{ submissions: Submission[]; total: number; totalPages: number }> - Paginated results
     */
    async findByFormId(formId: string, page: number = 1, limit: number = 10): Promise<{
        submissions: Submission[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            this.prisma.submission.findMany({
                where: { formId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                    attachments: true,
                },
            }),
            this.prisma.submission.count({
                where: { formId },
            }),
        ]);

        return {
            submissions,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Find all submissions on forms owned by a user.
     * Uses Form.userId so anonymous submissions (Submission.userId = null) are included.
     */
    async findByFormOwnerId(ownerUserId: string, page: number = 1, limit: number = 10): Promise<{
        submissions: Submission[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const where = { form: { userId: ownerUserId } };

        const [submissions, total] = await Promise.all([
            this.prisma.submission.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    form: {
                        select: {
                            id: true,
                            name: true,
                            endpointSlug: true,
                        },
                    },
                    attachments: true,
                },
            }),
            this.prisma.submission.count({ where }),
        ]);

        return {
            submissions,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Find all submissions for a specific user
     * @param userId - The user ID to search for
     * @param page - Page number (1-based)
     * @param limit - Number of items per page
     * @returns Promise<{ submissions: Submission[]; total: number; totalPages: number }> - Paginated results
     * @deprecated Use findByFormOwnerId. Submission.userId is null for public submissions.
     */
    async findByUserId(userId: string, page: number = 1, limit: number = 10): Promise<{
        submissions: Submission[];
        total: number;
        totalPages: number;
    }> {
        return this.findByFormOwnerId(userId, page, limit);
    }

    /**
     * Update a submission owned by the user. Mutation is constrained to Form.userId.
     */
    async updateForOwner(id: string, ownerUserId: string, data: Partial<{
        status: string;
        payload: any;
    }>): Promise<Submission> {
        const result = await this.prisma.submission.updateMany({
            where: {
                id,
                form: { userId: ownerUserId },
            },
            data,
        });

        if (result.count === 0) {
            throw new SubmissionNotFoundError();
        }

        const updated = await this.findByIdForOwner(id, ownerUserId);
        if (!updated) {
            throw new SubmissionNotFoundError();
        }
        return updated;
    }

    /**
     * Update a submission
     * @param id - The submission ID to update
     * @param data - Partial submission data to update
     * @returns Promise<Submission> - The updated submission
     * @deprecated Use updateForOwner so mutations cannot cross tenants.
     */
    async update(id: string, data: Partial<{
        status: string;
        payload: any;
    }>): Promise<Submission> {
        return this.prisma.submission.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete a submission owned by the user. Mutation is constrained to Form.userId.
     */
    async deleteForOwner(id: string, ownerUserId: string): Promise<Submission> {
        return this.prisma.$transaction(async (tx) => {
            const submission = await tx.submission.findFirst({
                where: {
                    id,
                    form: { userId: ownerUserId },
                },
            });

            if (!submission) {
                throw new SubmissionNotFoundError();
            }

            const result = await tx.submission.deleteMany({
                where: {
                    id,
                    form: { userId: ownerUserId },
                },
            });

            if (result.count === 0) {
                throw new SubmissionNotFoundError();
            }

            return submission;
        });
    }

    /**
     * Delete a submission
     * @param id - The submission ID to delete
     * @returns Promise<Submission> - The deleted submission
     * @deprecated Use deleteForOwner so mutations cannot cross tenants.
     */
    async delete(id: string): Promise<Submission> {
        return this.prisma.submission.delete({
            where: { id },
        });
    }

    /**
     * Bulk delete submissions owned by the user.
     * Rejects the whole request if any ID is missing or belongs to another tenant.
     */
    async bulkDeleteForOwner(ids: string[], ownerUserId: string): Promise<number> {
        const uniqueIds = [...new Set(ids)];

        return this.prisma.$transaction(async (tx) => {
            const ownedCount = await tx.submission.count({
                where: {
                    id: { in: uniqueIds },
                    form: { userId: ownerUserId },
                },
            });

            if (ownedCount !== uniqueIds.length) {
                throw new SubmissionNotFoundError();
            }

            const result = await tx.submission.deleteMany({
                where: {
                    id: { in: uniqueIds },
                    form: { userId: ownerUserId },
                },
            });

            return result.count;
        });
    }

    /**
     * Bulk delete submissions
     * @param ids - Array of submission IDs to delete
     * @returns Promise<number> - Number of deleted submissions
     * @deprecated Use bulkDeleteForOwner so mutations cannot cross tenants.
     */
    async bulkDelete(ids: string[]): Promise<number> {
        const result = await this.prisma.submission.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
        return result.count;
    }

    /**
     * Bulk update status for submissions owned by the user.
     * Rejects the whole request if any ID is missing or belongs to another tenant.
     */
    async bulkUpdateStatusForOwner(ids: string[], ownerUserId: string, status: string): Promise<number> {
        const uniqueIds = [...new Set(ids)];

        return this.prisma.$transaction(async (tx) => {
            const ownedCount = await tx.submission.count({
                where: {
                    id: { in: uniqueIds },
                    form: { userId: ownerUserId },
                },
            });

            if (ownedCount !== uniqueIds.length) {
                throw new SubmissionNotFoundError();
            }

            const result = await tx.submission.updateMany({
                where: {
                    id: { in: uniqueIds },
                    form: { userId: ownerUserId },
                },
                data: {
                    status,
                    updatedAt: new Date(),
                },
            });

            return result.count;
        });
    }

    /**
     * Bulk update submission status
     * @param ids - Array of submission IDs to update
     * @param status - New status to set
     * @returns Promise<number> - Number of updated submissions
     * @deprecated Use bulkUpdateStatusForOwner so mutations cannot cross tenants.
     */
    async bulkUpdateStatus(ids: string[], status: string): Promise<number> {
        const result = await this.prisma.submission.updateMany({
            where: {
                id: {
                    in: ids,
                },
            },
            data: {
                status,
                updatedAt: new Date(),
            },
        });
        return result.count;
    }

    /**
     * Check if a submission exists by ID
     * @param id - The submission ID to check
     * @returns Promise<boolean> - True if submission exists, false otherwise
     */
    async exists(id: string): Promise<boolean> {
        const submission = await this.prisma.submission.findUnique({
            where: { id },
            select: { id: true },
        });
        return submission !== null;
    }

    /**
     * Get submission count for a form
     * @param formId - The form ID to count submissions for
     * @returns Promise<number> - Number of submissions
     */
    async getSubmissionCount(formId: string): Promise<number> {
        return this.prisma.submission.count({
            where: { formId },
        });
    }

    /**
     * Get recent submissions from an IP address
     * @param ip - The IP address to check
     * @param minutes - Number of minutes to look back
     * @returns Promise<Submission[]> - Recent submissions from IP
     */
    async getRecentSubmissionsByIp(ip: string, minutes: number = 5): Promise<Submission[]> {
        const since = new Date(Date.now() - minutes * 60 * 1000);

        return this.prisma.submission.findMany({
            where: {
                ip,
                createdAt: {
                    gte: since,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
