import { MailerService, EmailTemplateData } from '../services/mailerService';
import { env } from '../config/env';
import { t } from './i18n';
import { formatFormDate, getConfirmationReplyTo, getFormLanguage } from './formSettings';

// [weeblr] Submission emails in the form's language. Upstream's templates are English only
// and insert submitted values as raw HTML; everything here is escaped.

export const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const EMAIL_PATTERN = /^[^\s@<>(),;:"[\]\\]+@[^\s@<>(),;:"[\]\\]+\.[^\s@<>(),;:"[\]\\]+$/;

/**
 * Only plain, valid addresses end up in a Reply-To header.
 */
export const isValidEmail = (value: unknown): value is string =>
    typeof value === 'string' && value.length <= 254 && EMAIL_PATTERN.test(value);

/**
 * no-reply address on the sending domain, taken from EMAIL_FROM.
 */
export const getNoReplyAddress = (): string => {
    const from = env.EMAIL_FROM || '';
    const address = /<([^>]+)>/.exec(from)?.[1] || from;
    const domain = address.split('@')[1]?.trim();
    return `no-reply@${domain || 'localhost'}`;
};

const ACCENTS = {
    notification: { color: '#3498db', tint: '#eaf4fb' },
    confirmation: { color: '#27ae60', tint: '#eafaf1' },
};

type Accent = typeof ACCENTS[keyof typeof ACCENTS];

const formatValue = (value: unknown, language: string): string => {
    if (value === null || value === undefined || value === '') {
        return t(language, 'value.empty');
    }
    if (typeof value === 'boolean') {
        return t(language, value ? 'value.yes' : 'value.no');
    }
    if (Array.isArray(value)) {
        return value
            .map((item) => (item && typeof item === 'object' && 'originalName' in item ? String((item as { originalName: unknown }).originalName) : formatValue(item, language)))
            .join(', ');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
};

const layout = (language: string, accent: Accent, heading: string, body: string, footer: string): string => `<!DOCTYPE html>
<html lang="${escapeHtml(language)}">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(heading)}</title>
</head>
<body style="margin: 0; padding: 24px; background: #f9fafb; font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.5;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-top: 3px solid ${accent.color}; border-radius: 8px; padding: 24px;">
        <h1 style="font-size: 20px; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid ${accent.color};">${escapeHtml(heading)}</h1>
        ${body}
        <p style="margin: 24px 0 0; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${escapeHtml(footer)}</p>
    </div>
</body>
</html>`;

const intro = (accent: Accent, text: string): string =>
    `<p style="margin: 0 0 20px; padding: 8px 12px; border-left: 4px solid ${accent.color}; background: ${accent.tint};">${escapeHtml(text)}</p>`;

const detailRow = (label: string, value: string): string =>
    `<tr><td style="padding: 2px 12px 2px 0; color: #6b7280; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td><td style="padding: 2px 0; color: #374151;">${escapeHtml(value)}</td></tr>`;

interface SubmissionEmailInput {
    data: EmailTemplateData;
    settings: unknown;
    createdAt: Date | string;
}

/**
 * Notification sent to the form owner: submitted data first, details below.
 * Reply-To is the visitor's address, so replying writes to them.
 */
export const sendNotificationEmail = async (mailer: MailerService, to: string, { data, settings, createdAt }: SubmissionEmailInput): Promise<boolean> => {
    const language = getFormLanguage(settings);
    const accent = ACCENTS.notification;
    const submittedAt = formatFormDate(createdAt, settings);
    const fields = data.fields || [];
    const replyTo = isValidEmail(data.submitterEmail) ? data.submitterEmail : '';
    const footer = replyTo ? t(language, 'email.footer.reply_to', { email: replyTo }) : t(language, 'email.footer.automated');

    const fieldRows = fields
        .map((field) => `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; vertical-align: top; width: 30%;">${escapeHtml(field.label)}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; white-space: pre-wrap;">${escapeHtml(formatValue(field.value, language))}</td></tr>`)
        .join('');

    const details = [
        detailRow(t(language, 'email.label.form'), data.formName),
        detailRow(t(language, 'email.label.submitted_at'), submittedAt),
        detailRow(t(language, 'email.label.submission_id'), data.submissionId),
        ...(data.ipAddress ? [detailRow(t(language, 'email.label.ip'), data.ipAddress)] : []),
    ].join('');

    const body = `
        ${intro(accent, t(language, 'email.notification.intro', { form: data.formName }))}
        <h2 style="font-size: 16px; margin: 0 0 8px;">${escapeHtml(t(language, 'email.notification.data_heading'))}</h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; margin: 0 0 24px;">
            <thead><tr style="background: ${accent.tint};"><th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid ${accent.color};">${escapeHtml(t(language, 'email.label.field'))}</th><th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid ${accent.color};">${escapeHtml(t(language, 'email.label.value'))}</th></tr></thead>
            <tbody>${fieldRows}</tbody>
        </table>
        <h2 style="font-size: 13px; margin: 0 0 4px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;">${escapeHtml(t(language, 'email.notification.details_heading'))}</h2>
        <table style="border-collapse: collapse; font-size: 13px;">${details}</table>`;

    const text = [
        t(language, 'email.notification.intro', { form: data.formName }),
        '',
        `${t(language, 'email.notification.data_heading')}:`,
        ...fields.map((field) => `- ${field.label}: ${formatValue(field.value, language)}`),
        '',
        `${t(language, 'email.notification.details_heading')}:`,
        `${t(language, 'email.label.form')}: ${data.formName}`,
        `${t(language, 'email.label.submitted_at')}: ${submittedAt}`,
        `${t(language, 'email.label.submission_id')}: ${data.submissionId}`,
        ...(data.ipAddress ? [`${t(language, 'email.label.ip')}: ${data.ipAddress}`] : []),
        '',
        footer,
    ].join('\n');

    return mailer.sendEmail({
        to,
        subject: t(language, 'email.notification.subject', { form: data.formName }),
        html: layout(language, accent, t(language, 'email.notification.heading'), body, footer),
        text,
        ...(replyTo && { replyTo }),
    });
};

/**
 * Confirmation sent to the submitter. It holds no submitted data, so it cannot be
 * used to send arbitrary content to an address typed in by a visitor.
 * Reply-To is the form's confirmation reply-to address, or a no-reply one.
 */
export const sendAutoReplyEmail = async (mailer: MailerService, to: string, { data, settings, createdAt }: SubmissionEmailInput): Promise<boolean> => {
    const language = getFormLanguage(settings);
    const accent = ACCENTS.confirmation;
    const submittedAt = formatFormDate(createdAt, settings);
    const replyTo = getConfirmationReplyTo(settings);
    const footer = replyTo ? t(language, 'email.footer.reply_to', { email: replyTo }) : t(language, 'email.footer.automated');

    const body = `
        ${intro(accent, t(language, 'email.autoreply.intro', { form: data.formName }))}
        <table style="border-collapse: collapse; font-size: 13px;">
            ${detailRow(t(language, 'email.label.submitted_at'), submittedAt)}
            ${detailRow(t(language, 'email.label.submission_id'), data.submissionId)}
        </table>`;

    const text = [
        t(language, 'email.autoreply.heading'),
        '',
        t(language, 'email.autoreply.intro', { form: data.formName }),
        `${t(language, 'email.label.submitted_at')}: ${submittedAt}`,
        `${t(language, 'email.label.submission_id')}: ${data.submissionId}`,
        '',
        footer,
    ].join('\n');

    return mailer.sendEmail({
        to,
        subject: t(language, 'email.autoreply.subject', { form: data.formName }),
        html: layout(language, accent, t(language, 'email.autoreply.heading'), body, footer),
        text,
        replyTo: replyTo || getNoReplyAddress(),
    });
};
