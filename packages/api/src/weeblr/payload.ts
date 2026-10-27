// [weeblr] Submitted values are stored as plain text only. Upstream stores whatever shape a
// visitor sends; nested objects (fields named like address[city]) then crashed the dashboard,
// and forged objects could break the spam filter or pose as uploaded files.
// - text, numbers, true/false: kept as text
// - lists of those: kept as lists of text (checkbox groups, multi-selects)
// - nested objects: flattened into fields named like "address.city"
// - anything deeper or odd (lists inside lists, objects inside lists): stored as JSON text
// Limits: 8 KB per value, 100 fields (list items count as one field), 200 characters per field name.

export const MAX_VALUE_BYTES = 8 * 1024;
export const MAX_FIELDS = 100;
export const MAX_NAME_LENGTH = 200;
const MAX_DEPTH = 5;

export type SubmissionValue = string | string[];

/**
 * Any value as text, never throwing: objects become JSON, failures an empty string.
 */
export const toText = (value: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (value === null || value === undefined) {
        return '';
    }
    try {
        return JSON.stringify(value) ?? '';
    } catch {
        return '';
    }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Submitted fields reduced to text values. Null when a limit is exceeded.
 */
export const sanitizeSubmissionPayload = (raw: unknown): Record<string, SubmissionValue> | null => {
    const fields = new Map<string, SubmissionValue>();

    const add = (name: string, value: SubmissionValue): boolean => {
        const values = Array.isArray(value) ? value : [value];
        if (name.length > MAX_NAME_LENGTH || values.some((item) => Buffer.byteLength(item, 'utf8') > MAX_VALUE_BYTES)) {
            return false;
        }
        fields.set(name, value);
        return fields.size <= MAX_FIELDS;
    };

    const walk = (prefix: string, value: Record<string, unknown>, depth: number): boolean => {
        for (const key of Object.keys(value)) {
            if (key === '__proto__') {
                continue;
            }
            const name = prefix ? `${prefix}.${key}` : key;
            const item = value[key];
            let ok: boolean;
            if (Array.isArray(item)) {
                ok = item.length <= MAX_FIELDS && add(name, item.map(toText));
            } else if (isPlainObject(item) && depth < MAX_DEPTH) {
                ok = walk(name, item, depth + 1);
            } else {
                ok = add(name, toText(item));
            }
            if (!ok) {
                return false;
            }
        }
        return true;
    };

    if (isPlainObject(raw) && !walk('', raw, 0)) {
        return null;
    }

    const payload: Record<string, SubmissionValue> = {};
    for (const [name, value] of fields) {
        Object.defineProperty(payload, name, { value, enumerable: true, writable: true, configurable: true });
    }
    return payload;
};
