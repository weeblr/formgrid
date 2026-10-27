import path from 'path';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../presentation/middleware/auth';
import { deleteFile } from '../middleware/fileUpload';

// [weeblr] Account deletion, not available in the open source version

const deleteAccountSchema = z.object({
    email: z.string().min(1, 'Email is required'),
});

/**
 * Collect uploaded file names referenced in a submission payload.
 * Same payload shape as scripts/file-cleanup.ts. Payloads come from public
 * form submissions, so anything that is not a bare file name is ignored.
 */
const collectFilenames = (payload: unknown): string[] => {
    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const filenames: string[] = [];
    for (const value of Object.values(payload as Record<string, unknown>)) {
        const files = Array.isArray(value) ? value : [value];
        for (const file of files) {
            const filename = (file as { filename?: unknown } | null)?.filename;
            if (typeof filename === 'string' && filename !== '' && path.basename(filename) === filename && !filename.startsWith('.')) {
                filenames.push(filename);
            }
        }
    }

    return filenames;
};

export function createWeeblrAccountRoutes(prisma: PrismaClient): Router {
    const router = Router();

    /**
     * DELETE /api/user/me
     * Delete the current user's account, forms, submissions and uploaded files.
     * The user must confirm by sending their email address.
     */
    router.delete('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
                return;
            }

            const validationResult = deleteAccountSchema.safeParse(req.body);
            if (!validationResult.success) {
                res.status(400).json({
                    success: false,
                    message: 'Email confirmation is required',
                });
                return;
            }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }

            if (validationResult.data.email.trim().toLowerCase() !== user.email.toLowerCase()) {
                res.status(400).json({
                    success: false,
                    message: 'Email address does not match your account',
                });
                return;
            }

            const submissions = await prisma.submission.findMany({
                where: { form: { userId } },
                select: { payload: true },
            });

            // Database rows go first: a file that fails to delete is only an orphan
            await prisma.user.delete({ where: { id: userId } });

            for (const submission of submissions) {
                for (const filename of collectFilenames(submission.payload)) {
                    try {
                        await deleteFile(filename);
                    } catch (error) {
                        console.error(`Failed to delete file ${filename} of deleted account ${userId}:`, error);
                    }
                }
            }

            res.status(200).json({
                success: true,
                message: 'Account deleted successfully',
            });
        } catch (error) {
            console.error('Account deletion failed:', error);
            res.status(500).json({
                success: false,
                message: 'Account deletion failed',
            });
        }
    });

    return router;
}
