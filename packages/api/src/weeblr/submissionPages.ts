import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { t, MessageKey } from './i18n';
import { getFormLanguage } from './formSettings';
import { escapeHtml } from './emails';

// [weeblr] Success and error pages shown after a public HTML form submission,
// in the form's language. Upstream redirects to hardcoded English pages.

const PAGES_PATH = '/api/weeblr/submission';

/**
 * Static pages served by earlier versions of the fork. A form that saved one of
 * them as its redirect URL gets the translated page instead.
 */
const LEGACY_SUCCESS_PATHS = ['/submission-success.html', 'http://localhost:5173/success.html'];

const ERROR_CODES = ['form_not_found', 'form_inactive', 'multiple_submissions', 'required_field', 'generic'] as const;
type ErrorCode = typeof ERROR_CODES[number];

/**
 * Where a successful HTML submission goes: the form's own redirect URL, or our page.
 */
export const getSuccessRedirectUrl = (endpointSlug: string | undefined, redirectUrl: unknown): string => {
    if (typeof redirectUrl === 'string' && redirectUrl !== '' && !LEGACY_SUCCESS_PATHS.some((path) => redirectUrl.endsWith(path))) {
        return redirectUrl;
    }
    return `${env.APP_URL}${PAGES_PATH}/success?form=${encodeURIComponent(endpointSlug || '')}`;
};

/**
 * Error page URL for an upstream error message, turned into a code the page can translate.
 */
export const getErrorRedirectUrl = (endpointSlug: string | undefined, errorMessage: string): string => {
    let code: ErrorCode = 'generic';
    let field = '';

    const requiredField = /^Field '(.+)' is required$/.exec(errorMessage);
    if (errorMessage === 'Form not found') {
        code = 'form_not_found';
    } else if (errorMessage === 'Form is not active') {
        code = 'form_inactive';
    } else if (errorMessage === 'Multiple submissions not allowed') {
        code = 'multiple_submissions';
    } else if (requiredField) {
        code = 'required_field';
        field = requiredField[1] as string;
    }

    const params = new URLSearchParams({ form: endpointSlug || '', code });
    if (field) {
        params.set('field', field);
    }
    return `${env.APP_URL}${PAGES_PATH}/error?${params.toString()}`;
};

const page = (language: string, title: string, iconColor: string, iconBackground: string, iconPath: string, body: string): string => `<!DOCTYPE html>
<html lang="${escapeHtml(language)}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>${escapeHtml(title)}</title>
    <style>
        body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; box-sizing: border-box; background: #f9fafb; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; }
        .card { max-width: 28rem; width: 100%; background: #fff; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); padding: 2rem; text-align: center; }
        .icon { width: 4rem; height: 4rem; margin: 0 auto 1rem; border-radius: 50%; background: ${iconBackground}; display: flex; align-items: center; justify-content: center; }
        .icon svg { width: 2rem; height: 2rem; color: ${iconColor}; }
        h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
        p { color: #4b5563; margin: 0; }
        button { margin-top: 1.5rem; font: inherit; font-size: 0.875rem; color: #fff; background: #111827; border: 0; border-radius: 0.375rem; padding: 0.5rem 1.5rem; cursor: pointer; }
        button:hover { background: #1f2937; }
        button:focus-visible { outline: 2px solid #6b7280; outline-offset: 2px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"></path>
            </svg>
        </div>
        ${body}
    </div>
</body>
</html>`;

const send = (res: Response, status: number, html: string): void => {
    res.status(status)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'")
        .set('X-Content-Type-Options', 'nosniff')
        .send(html);
};

export function createWeeblrSubmissionPagesRoutes(prisma: PrismaClient): Router {
    const router = Router();

    const findLanguage = async (req: Request): Promise<string> => {
        const slug = typeof req.query.form === 'string' ? req.query.form : '';
        if (!slug) {
            return getFormLanguage(null);
        }
        const form = await prisma.form.findUnique({ where: { endpointSlug: slug }, select: { settings: true } });
        return getFormLanguage(form?.settings);
    };

    /**
     * GET /api/weeblr/submission/success?form=<slug>
     */
    router.get('/submission/success', async (req: Request, res: Response): Promise<void> => {
        const language = await findLanguage(req);
        send(res, 200, page(
            language,
            t(language, 'page.success.title'),
            '#16a34a',
            '#dcfce7',
            'M5 13l4 4L19 7',
            `<h1>${escapeHtml(t(language, 'page.success.heading'))}</h1>
        <p>${escapeHtml(t(language, 'page.success.message'))}</p>`
        ));
    });

    /**
     * GET /api/weeblr/submission/error?form=<slug>&code=<code>[&field=<name>]
     */
    router.get('/submission/error', async (req: Request, res: Response): Promise<void> => {
        const language = await findLanguage(req);
        const code: ErrorCode = ERROR_CODES.find((known) => known === req.query.code) || 'generic';
        const field = typeof req.query.field === 'string' ? req.query.field.slice(0, 100) : '';
        const message = t(language, `error.${code}` as MessageKey, { field });

        send(res, 200, page(
            language,
            t(language, 'page.error.title'),
            '#dc2626',
            '#fee2e2',
            'M6 18L18 6M6 6l12 12',
            `<h1>${escapeHtml(t(language, 'page.error.heading'))}</h1>
        <p>${escapeHtml(message)}</p>
        <button type="button" onclick="history.back()">${escapeHtml(t(language, 'page.error.back'))}</button>`
        ));
    });

    return router;
}
