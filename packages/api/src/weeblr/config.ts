import { Router, Request, Response } from 'express';

// [weeblr] Instance settings shared with the dashboard

/**
 * Account creation and deletion are only available when ENABLE_ACCOUNTS=true.
 */
export const accountsEnabled = (): boolean => process.env.ENABLE_ACCOUNTS === 'true';

export function createWeeblrConfigRoutes(): Router {
    const router = Router();

    /**
     * GET /api/weeblr/config
     * Public settings the dashboard needs before sign-in.
     */
    router.get('/config', (_req: Request, res: Response): void => {
        res.status(200).json({
            success: true,
            data: {
                enableAccounts: accountsEnabled(),
            },
        });
    });

    return router;
}
