import { MailerService, EmailTemplateData } from '../services/mailerService';
import { t } from './i18n';
import { formatFormDate, getFormLanguage } from './formSettings';

// [weeblr] Submission emails in the form's language. Upstream's templates are English only
// and insert submitted values as raw HTML; everything here is escaped.

export const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

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

const layout = (language: string, heading: string, body: string): string => `<!DOCTYPE html>
<html lang="${escapeHtml(language)}">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(heading)}</title>
</head>
<body style="margin: 0; padding: 24px; background: #f9fafb; font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.5;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(heading)}</h1>
        ${body}
        <p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">${escapeHtml(t(language, 'email.footer.automated'))}</p>
    </div>
</body>
</html>`;

const detailRow = (label: string, value: string): string =>
    `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">${escapeHtml(label)}</td><td style="padding: 4px 0;">${escapeHtml(value)}</td></tr>`;

interface SubmissionEmailInput {
    data: EmailTemplateData;
    settings: unknown;
    createdAt: Date | string;
}

/**
 * Notification sent to the form owner, with every submitted field.
 */
export const sendNotificationEmail = async (mailer: MailerService, to: string, { data, settings, createdAt }: SubmissionEmailInput): Promise<boolean> => {
    const language = getFormLanguage(settings);
    const submittedAt = formatFormDate(createdAt, settings);

    const details = [
        detailRow(t(language, 'email.label.form'), data.formName),
        detailRow(t(language, 'email.label.submitted_at'), submittedAt),
        detailRow(t(language, 'email.label.submission_id'), data.submissionId),
        ...(data.ipAddress ? [detailRow(t(language, 'email.label.ip'), data.ipAddress)] : []),
    ].join('');

    const fieldRows = (data.fields || [])
        .map((field) => `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold; vertical-align: top;">${escapeHtml(field.label)}</td><td style="padding: 8px; border: 1px solid #e5e7eb; white-space: pre-wrap;">${escapeHtml(formatValue(field.value, language))}</td></tr>`)
        .join('');

    const body = `
        <p style="margin: 0 0 16px;">${escapeHtml(t(language, 'email.notification.intro', { form: data.formName }))}</p>
        <table style="border-collapse: collapse; margin: 0 0 24px;">${details}</table>
        <h2 style="font-size: 16px; margin: 0 0 8px;">${escapeHtml(t(language, 'email.notification.data_heading'))}</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <thead><tr><th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${escapeHtml(t(language, 'email.label.field'))}</th><th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${escapeHtml(t(language, 'email.label.value'))}</th></tr></thead>
            <tbody>${fieldRows}</tbody>
        </table>`;

    const text = [
        t(language, 'email.notification.intro', { form: data.formName }),
        '',
        `${t(language, 'email.label.form')}: ${data.formName}`,
        `${t(language, 'email.label.submitted_at')}: ${submittedAt}`,
        `${t(language, 'email.label.submission_id')}: ${data.submissionId}`,
        ...(data.ipAddress ? [`${t(language, 'email.label.ip')}: ${data.ipAddress}`] : []),
        '',
        `${t(language, 'email.notification.data_heading')}:`,
        ...(data.fields || []).map((field) => `- ${field.label}: ${formatValue(field.value, language)}`),
        '',
        t(language, 'email.footer.automated'),
    ].join('\n');

    return mailer.sendEmail({
        to,
        subject: t(language, 'email.notification.subject', { form: data.formName }),
        html: layout(language, t(language, 'email.notification.heading'), body),
        text,
    });
};

/**
 * Confirmation sent to the submitter. It holds no submitted data, so it cannot be
 * used to send arbitrary content to an address typed in by a visitor.
 */
export const sendAutoReplyEmail = async (mailer: MailerService, to: string, { data, settings, createdAt }: SubmissionEmailInput): Promise<boolean> => {
    const language = getFormLanguage(settings);
    const submittedAt = formatFormDate(createdAt, settings);

    const body = `
        <p style="margin: 0 0 16px;">${escapeHtml(t(language, 'email.autoreply.intro', { form: data.formName }))}</p>
        <table style="border-collapse: collapse;">
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
        t(language, 'email.footer.automated'),
    ].join('\n');

    return mailer.sendEmail({
        to,
        subject: t(language, 'email.autoreply.subject', { form: data.formName }),
        html: layout(language, t(language, 'email.autoreply.heading'), body),
        text,
    });
};
