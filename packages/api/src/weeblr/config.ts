import { Router, Request, Response } from 'express';
import { LANGUAGES, DEFAULT_LANGUAGE } from './i18n';
import { DEFAULT_TIMEZONE } from './formSettings';

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
                languages: LANGUAGES.map(({ code, name }) => ({ code, name })),
                defaultLanguage: DEFAULT_LANGUAGE,
                defaultTimezone: DEFAULT_TIMEZONE,
            },
        });
    });

    return router;
}
