import { z } from 'zod';
import { Job } from 'bull';
import { prisma } from '../config/prisma';
import { emailQueue, addEmailJob, addAutoReplyEmailJob } from '../queue/queueConfig';
import { isValidEmail } from './emails';

// [weeblr] Optional per-form spam filtering with Jev (TypeSafe AI). Each submission gets a spam
// score and a danger score (phishing, malware). Per score, T1 and T2 thresholds in percent:
// - below T1: notification and confirmation as usual
// - from T1 to T2: notification only, flagged in its subject, scores in its details
// - from T2: status "spam", nothing sent
// When Jev cannot be reached, the notification is sent marked "not classified", with no confirmation.
// Fields listed in excludedFields (raw names, comma-separated, case-insensitive) are not sent to Jev;
// they are still stored and shown in emails and the dashboard.

export const WEEBLR_CLASSIFY_JOB = 'weeblr-classify-submission';

const JEV_API_URL = (process.env.JEV_API_URL || 'https://api.typesafe.ai').replace(/\/+$/, '');
const JEV_MODEL = process.env.JEV_MODEL || 'jev-latest';
const JEV_TIMEOUT_MS = 15000;
const MAX_STATE_LENGTH = 20000;

export const DEFAULT_THRESHOLDS = { spamT1: 50, spamT2: 90, dangerT1: 50, dangerT2: 90 };

/**
 * A threshold in percent; empty (null or missing) means its default.
 */
const percent = z.number().min(0).max(100).nullable().optional();

type Thresholds = typeof DEFAULT_THRESHOLDS;

const withDefaultThresholds = (value: { spamT1?: number | null | undefined; spamT2?: number | null | undefined; dangerT1?: number | null | undefined; dangerT2?: number | null | undefined }): Thresholds => ({
    spamT1: value.spamT1 ?? DEFAULT_THRESHOLDS.spamT1,
    spamT2: value.spamT2 ?? DEFAULT_THRESHOLDS.spamT2,
    dangerT1: value.dangerT1 ?? DEFAULT_THRESHOLDS.dangerT1,
    dangerT2: value.dangerT2 ?? DEFAULT_THRESHOLDS.dangerT2,
});

export const spamFilteringSchema = z.object({
    enabled: z.boolean(),
    apiKey: z.string().trim().max(500).optional(),
    excludedFields: z.string().max(1000).optional(),
    spamT1: percent,
    spamT2: percent,
    dangerT1: percent,
    dangerT2: percent,
})
    .refine((value) => !value.enabled || !!value.apiKey, { message: 'A Jev API key is required to enable spam filtering', path: ['apiKey'] })
    .refine((value) => withDefaultThresholds(value).spamT1 <= withDefaultThresholds(value).spamT2, { message: 'Spam T1 must not be above T2', path: ['spamT2'] })
    .refine((value) => withDefaultThresholds(value).dangerT1 <= withDefaultThresholds(value).dangerT2, { message: 'Danger T1 must not be above T2', path: ['dangerT2'] });

/**
 * Spam filtering settings in use: enabled, with a key, and every threshold set.
 */
export type SpamFilteringSettings = Thresholds & { enabled: true; apiKey: string; excludedFields: string[] };

/**
 * Field names from a comma-separated list, trimmed and lowercased, empty entries dropped.
 */
export const parseExcludedFields = (list: unknown): string[] =>
    typeof list === 'string' ? list.split(',').map((field) => field.trim().toLowerCase()).filter((field) => field !== '') : [];

/**
 * Spam filtering settings of a form, empty thresholds replaced by their defaults.
 * Null when disabled or incomplete.
 */
export const getSpamFiltering = (settings: unknown): SpamFilteringSettings | null => {
    const parsed = spamFilteringSchema.safeParse((settings as { spamFiltering?: unknown } | null)?.spamFiltering);
    if (!parsed.success || !parsed.data.enabled || !parsed.data.apiKey) {
        return null;
    }
    return { enabled: true, apiKey: parsed.data.apiKey, excludedFields: parseExcludedFields(parsed.data.excludedFields), ...withDefaultThresholds(parsed.data) };
};

/**
 * Form settings without the Jev API key, for anything leaving the server.
 */
export const withoutSecrets = (settings: unknown): unknown => {
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    const { spamFiltering, ...rest } = settings as Record<string, unknown>;
    if (!spamFiltering || typeof spamFiltering !== 'object') {
        return rest;
    }
    const { apiKey, ...publicSpamFiltering } = spamFiltering as Record<string, unknown>;
    return { ...rest, spamFiltering: publicSpamFiltering };
};

export type SpamBand = 'ok' | 'suspicious' | 'held';

export interface SpamVerdict {
    classified: boolean;
    spamScore?: number;
    dangerScore?: number;
    band: SpamBand;
    suspiciousSpam?: boolean;
    suspiciousDanger?: boolean;
    model?: string;
}

const bandOf = (score: number, t1: number, t2: number): SpamBand => {
    const value = score * 100;
    if (value >= t2) {
        return 'held';
    }
    return value >= t1 ? 'suspicious' : 'ok';
};

export const getVerdict = (spamScore: number, dangerScore: number, filtering: SpamFilteringSettings, model?: string): SpamVerdict => {
    const spamBand = bandOf(spamScore, filtering.spamT1, filtering.spamT2);
    const dangerBand = bandOf(dangerScore, filtering.dangerT1, filtering.dangerT2);
    const band: SpamBand = spamBand === 'held' || dangerBand === 'held' ? 'held' : spamBand === 'suspicious' || dangerBand === 'suspicious' ? 'suspicious' : 'ok';
    return {
        classified: true,
        spamScore,
        dangerScore,
        band,
        suspiciousSpam: spamBand !== 'ok',
        suspiciousDanger: dangerBand !== 'ok',
        ...(model && { model }),
    };
};

/**
 * Submission as plain text for Jev: form name, then each field in submitted order,
 * except the excluded ones.
 */
export const describeSubmission = (formName: string, payload: unknown, excludedFields: string[] = []): string => {
    const lines = [`Form: ${formName}`, ''];
    for (const [field, value] of Object.entries((payload as Record<string, unknown>) || {})) {
        if (excludedFields.includes(field.toLowerCase())) {
            continue;
        }
        let text: string;
        if (Array.isArray(value)) {
            text = value.map((item) => (item && typeof item === 'object' && 'originalName' in item ? `[file: ${String((item as { originalName: unknown }).originalName)}]` : String(item))).join(', ');
        } else if (value && typeof value === 'object') {
            text = JSON.stringify(value);
        } else {
            text = String(value ?? '');
        }
        lines.push(`${field}: ${text}`);
    }
    return lines.join('\n').slice(0, MAX_STATE_LENGTH);
};

const QUESTIONS = {
    spam: {
        type: 'noul',
        instructions: 'Is this submission unsolicited, mass-produced or automated: for example an offer of SEO, marketing, web design or other services to the site owner, advertising, link-building, or text not written for this website? A genuine visitor writing about their own needs is not spam, even when it mentions products, prices, quotes, payments or links.',
    },
    danger: {
        type: 'noul',
        instructions: 'Is this submission trying to deceive or harm the reader: for example impersonating a company, a bank or a person, creating false urgency, asking for passwords or codes, pushing to click a link or open a file that does not match what the message claims, or requesting payment under a false pretext? Ordinary links, invoices, payment questions, or requests to be contacted are normal and not dangerous on their own.',
    },
};

/**
 * Ask Jev both questions. Throws on any HTTP or format error.
 */
export const classifyWithJev = async (apiKey: string, formName: string, payload: unknown, excludedFields: string[] = []): Promise<{ spam: number; danger: number; model?: string }> => {
    const response = await fetch(`${JEV_API_URL}/v1/systemone`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: describeSubmission(formName, payload, excludedFields), model: JEV_MODEL, questions: QUESTIONS }),
        signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Jev returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as { model?: string; answers?: Record<string, { noul?: unknown }> };
    const spam = body.answers?.spam?.noul;
    const danger = body.answers?.danger?.noul;
    if (typeof spam !== 'number' || typeof danger !== 'number') {
        throw new Error('Jev answer is missing a score');
    }
    return { spam, danger, ...(body.model && { model: body.model }) };
};

interface ClassifyJobData {
    submission: any;
    form: any;
}

/**
 * Queue the classification of a submission; notification and confirmation are queued after it.
 */
export const addClassificationJob = (submission: unknown, form: unknown) =>
    emailQueue.add(WEEBLR_CLASSIFY_JOB, { submission, form } as ClassifyJobData);

const queueFollowUps = async (submission: any, form: any, verdict: SpamVerdict): Promise<void> => {
    const settings = form.settings || {};

    if (verdict.band !== 'held' && settings.requireEmailNotification && settings.notificationEmail) {
        await addEmailJob({
            submissionId: submission.id,
            formId: form.id,
            notificationEmail: settings.notificationEmail,
            submissionData: { ...submission, weeblrSpam: verdict },
            formData: form,
        });
    }

    if (verdict.classified && verdict.band === 'ok' && isValidEmail(submission.email) && settings.sendAutoReply === true) {
        await addAutoReplyEmailJob({
            submissionId: submission.id,
            formId: form.id,
            submitterEmail: submission.email,
            submissionData: submission,
            formData: form,
        });
    }
};

/**
 * Worker processor of WEEBLR_CLASSIFY_JOB. Jev errors are retried by the queue;
 * on the last attempt the submission goes through as not classified.
 */
export const processClassificationJob = async (job: Job<ClassifyJobData>): Promise<void> => {
    const { submission, form } = job.data;
    const filtering = getSpamFiltering(form.settings);

    if (!filtering) {
        await queueFollowUps(submission, form, { classified: false, band: 'ok' });
        return;
    }

    let verdict: SpamVerdict;
    try {
        const result = await classifyWithJev(filtering.apiKey, form.name, submission.payload, filtering.excludedFields);
        verdict = getVerdict(result.spam, result.danger, filtering, result.model);
        console.log(`Submission ${submission.id} classified by ${result.model || 'Jev'}: spam ${result.spam}, danger ${result.danger}, ${verdict.band}`);
    } catch (error) {
        const attempts = job.opts.attempts || 1;
        if (job.attemptsMade + 1 < attempts) {
            throw error;
        }
        console.error(`Classification of submission ${submission.id} failed, sending it unclassified:`, error);
        await queueFollowUps(submission, form, { classified: false, band: 'ok' });
        return;
    }

    await prisma.submission.update({
        where: { id: submission.id },
        data: {
            spamScore: verdict.spamScore ?? null,
            dangerScore: verdict.dangerScore ?? null,
            ...(verdict.band === 'held' && { status: 'spam' }),
        },
    });

    await queueFollowUps(submission, form, verdict);
};
