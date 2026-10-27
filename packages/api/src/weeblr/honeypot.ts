// [weeblr] Honeypot with a per-form field name. Upstream hardcodes an obvious
// "honeypot" name and drops its value before checking it, so it never catches anything.

export const DEFAULT_HONEYPOT_FIELD = 'fax';

/**
 * Allowed honeypot field names: a letter, then letters, digits, "_" or "-".
 */
export const HONEYPOT_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,49}$/;

/**
 * Field name configured on the form, or the default.
 */
export const getHoneypotField = (spamProtection: unknown): string => {
    const field = (spamProtection as { honeypotField?: unknown } | null | undefined)?.honeypotField;
    if (typeof field === 'string' && HONEYPOT_FIELD_PATTERN.test(field.trim())) {
        return field.trim();
    }
    return DEFAULT_HONEYPOT_FIELD;
};

const isFilled = (value: unknown): boolean => {
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim() !== '';
    }
    return true;
};

/**
 * Remove the honeypot field from a submission body and tell whether it was filled.
 * HTML forms send fields at the top level, JSON clients inside formData.
 */
export const takeHoneypot = (body: unknown, field: string): boolean => {
    if (!body || typeof body !== 'object') {
        return false;
    }

    let filled = false;
    const record = body as Record<string, unknown>;

    if (Object.prototype.hasOwnProperty.call(record, field)) {
        filled = isFilled(record[field]);
        delete record[field];
    }

    const formData = record.formData;
    if (formData && typeof formData === 'object' && Object.prototype.hasOwnProperty.call(formData, field)) {
        filled = filled || isFilled((formData as Record<string, unknown>)[field]);
        delete (formData as Record<string, unknown>)[field];
    }

    return filled;
};
