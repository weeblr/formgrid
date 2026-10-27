import { z } from 'zod';
import { DEFAULT_LANGUAGE, getLocale, isSupportedLanguage } from './i18n';
import { spamFilteringSchema } from './spamFiltering';

// [weeblr] Per-form settings added by the fork, stored in form.settings:
// - language: language of everything visitors and the owner see about a submission
// - timezone: IANA zone used for dates in emails
// - sendAutoReply: email a confirmation to the submitter, off unless turned on
// - confirmationReplyTo: Reply-To of those confirmations, a no-reply address when empty
// - spamFiltering: optional Jev spam filtering, see spamFiltering.ts

export const DEFAULT_TIMEZONE = 'UTC';

export const isValidTimeZone = (zone: unknown): zone is string => {
    if (typeof zone !== 'string' || zone === '') {
        return false;
    }
    try {
        new Intl.DateTimeFormat('en', { timeZone: zone });
        return true;
    } catch {
        return false;
    }
};

/**
 * Zod fields for the fork's settings, spread into the upstream form settings schemas.
 */
export const weeblrFormSettingsFields = {
    language: z.string().refine(isSupportedLanguage, 'Unsupported language').optional(),
    timezone: z.string().refine(isValidTimeZone, 'Unknown timezone').optional(),
    sendAutoReply: z.boolean().optional(),
    confirmationReplyTo: z.union([z.literal(''), z.string().email('Invalid reply-to address')]).optional(),
    spamFiltering: spamFilteringSchema.optional(),
};

type SettingsLike = { language?: unknown; timezone?: unknown; sendAutoReply?: unknown; confirmationReplyTo?: unknown } | null | undefined;

export const getFormLanguage = (settings: unknown): string => {
    const language = (settings as SettingsLike)?.language;
    return isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
};

export const getFormTimezone = (settings: unknown): string => {
    const zone = (settings as SettingsLike)?.timezone;
    return isValidTimeZone(zone) ? zone : DEFAULT_TIMEZONE;
};

export const isAutoReplyEnabled = (settings: unknown): boolean => (settings as SettingsLike)?.sendAutoReply === true;

/**
 * Reply-To of confirmation emails set on the form, empty when not set.
 */
export const getConfirmationReplyTo = (settings: unknown): string => {
    const address = (settings as SettingsLike)?.confirmationReplyTo;
    return typeof address === 'string' && z.string().email().safeParse(address).success ? address : '';
};

/**
 * Date and time in the form's language and timezone, with the zone shown.
 */
export const formatFormDate = (date: Date | string, settings: unknown): string =>
    new Intl.DateTimeFormat(getLocale(getFormLanguage(settings)), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: getFormTimezone(settings),
        timeZoneName: 'short',
    }).format(new Date(date));
