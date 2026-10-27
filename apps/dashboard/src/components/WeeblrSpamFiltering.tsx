import React from 'react'

// [weeblr] Per-form spam filtering with Jev (TypeSafe AI): API key and thresholds

// Thresholds are in percent; null means empty, which uses the default
export interface WeeblrSpamFilteringValue {
    enabled: boolean
    apiKey: string
    excludedFields: string
    spamT1: number | null
    spamT2: number | null
    dangerT1: number | null
    dangerT2: number | null
}

const DEFAULT_THRESHOLDS = { spamT1: 50, spamT2: 90, dangerT1: 50, dangerT2: 90 }

const readPercent = (value: unknown): number | null =>
    typeof value === 'number' && value >= 0 && value <= 100 ? value : null

/**
 * Spam filtering settings of a form as edited here, with defaults.
 */
export const readWeeblrSpamFiltering = (settings: any): WeeblrSpamFilteringValue => {
    const saved = settings?.spamFiltering || {}
    return {
        enabled: saved.enabled === true,
        apiKey: typeof saved.apiKey === 'string' ? saved.apiKey : '',
        excludedFields: typeof saved.excludedFields === 'string' ? saved.excludedFields : '',
        spamT1: readPercent(saved.spamT1),
        spamT2: readPercent(saved.spamT2),
        dangerT1: readPercent(saved.dangerT1),
        dangerT2: readPercent(saved.dangerT2),
    }
}

export const weeblrSpamFilteringChanged = (value: WeeblrSpamFilteringValue, settings: any): boolean => {
    const saved = readWeeblrSpamFiltering(settings)
    return (Object.keys(saved) as Array<keyof WeeblrSpamFilteringValue>).some((key) => saved[key] !== value[key])
}

/**
 * Value saved in the form settings; the key and the excluded fields are trimmed and left out when empty.
 */
export const weeblrSpamFilteringPayload = (value: WeeblrSpamFilteringValue) => {
    const apiKey = value.apiKey.trim()
    const excludedFields = value.excludedFields.trim()
    return { ...value, apiKey: apiKey || undefined, excludedFields: excludedFields || undefined }
}

const threshold = (value: WeeblrSpamFilteringValue, key: keyof typeof DEFAULT_THRESHOLDS): number => value[key] ?? DEFAULT_THRESHOLDS[key]

export const weeblrSpamFilteringErrors = (value: WeeblrSpamFilteringValue): string[] => [
    ...(value.enabled && value.apiKey.trim() === '' ? ['A Jev API key is required to enable spam filtering.'] : []),
    ...(threshold(value, 'spamT1') > threshold(value, 'spamT2') ? ['Spam: T1 must not be above T2.'] : []),
    ...(threshold(value, 'dangerT1') > threshold(value, 'dangerT2') ? ['Danger: T1 must not be above T2.'] : []),
]

const inputClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500'

const PercentInput: React.FC<{ id: string, label: string, value: number | null, placeholder: number, onChange: (value: number | null) => void }> = ({ id, label, value, placeholder, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex items-center gap-2">
            <input
                id={id}
                type="number"
                min={0}
                max={100}
                step={1}
                value={value ?? ''}
                placeholder={String(placeholder)}
                onChange={(e) => onChange(e.target.value.trim() === '' ? null : Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))))}
                className={inputClassName}
            />
            <span className="text-sm text-gray-500">%</span>
        </div>
    </div>
)

interface WeeblrSpamFilteringProps {
    value: WeeblrSpamFilteringValue
    onChange: (value: WeeblrSpamFilteringValue) => void
    children?: React.ReactNode
}

export const WeeblrSpamFiltering: React.FC<WeeblrSpamFilteringProps> = ({ value, onChange, children }) => {
    const update = (patch: Partial<WeeblrSpamFilteringValue>) => onChange({ ...value, ...patch })
    const errors = weeblrSpamFilteringErrors(value)

    return (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Spam Filtering</h3>
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-medium text-gray-900">Enable Spam Filtering</div>
                        <div className="text-sm text-gray-500">Each submission is sent to Jev (TypeSafe AI), which scores how likely it is to be spam, and how likely it is to be dangerous (phishing, malware).</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={value.enabled}
                            onChange={(e) => update({ enabled: e.target.checked })}
                            className="sr-only peer"
                            aria-label="Enable Spam Filtering"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                </div>

                {value.enabled && (
                    <>
                        <div>
                            <label htmlFor="jev-api-key" className="block text-sm font-medium text-gray-700 mb-2">Jev API key</label>
                            <input
                                id="jev-api-key"
                                type="password"
                                value={value.apiKey}
                                onChange={(e) => update({ apiKey: e.target.value })}
                                autoComplete="off"
                                spellCheck={false}
                                className={inputClassName}
                            />
                        </div>

                        <div>
                            <label htmlFor="jev-excluded-fields" className="block text-sm font-medium text-gray-700 mb-2">Fields not sent to Jev</label>
                            <input
                                id="jev-excluded-fields"
                                type="text"
                                value={value.excludedFields}
                                onChange={(e) => update({ excludedFields: e.target.value })}
                                placeholder="e.g. email, phone"
                                maxLength={1000}
                                autoComplete="off"
                                spellCheck={false}
                                className={inputClassName}
                            />
                            <p className="mt-1 text-sm text-gray-500">Field names as the form sends them, separated by commas, in any case. These fields are left out of what Jev analyses, for privacy or to avoid false positives. They are still stored, and shown in emails and here.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <PercentInput id="spam-t1" label="Spam: flag from (T1)" value={value.spamT1} placeholder={DEFAULT_THRESHOLDS.spamT1} onChange={(spamT1) => update({ spamT1 })} />
                            <PercentInput id="spam-t2" label="Spam: hold from (T2)" value={value.spamT2} placeholder={DEFAULT_THRESHOLDS.spamT2} onChange={(spamT2) => update({ spamT2 })} />
                            <PercentInput id="danger-t1" label="Danger: flag from (T1)" value={value.dangerT1} placeholder={DEFAULT_THRESHOLDS.dangerT1} onChange={(dangerT1) => update({ dangerT1 })} />
                            <PercentInput id="danger-t2" label="Danger: hold from (T2)" value={value.dangerT2} placeholder={DEFAULT_THRESHOLDS.dangerT2} onChange={(dangerT2) => update({ dangerT2 })} />
                        </div>

                        <p className="text-sm text-gray-500">Leave a threshold empty to use its default: {DEFAULT_THRESHOLDS.spamT1} % for T1, {DEFAULT_THRESHOLDS.spamT2} % for T2.</p>

                        <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                            <li>Below T1: notification and confirmation email as usual.</li>
                            <li>From T1: notification only, with [Spam?] or [Danger?] in its subject and the scores in its details. No confirmation email.</li>
                            <li>From T2: the submission is kept, marked as spam, and no email is sent.</li>
                            <li>If Jev cannot be reached, the notification is sent marked as not classified, with no confirmation email.</li>
                        </ul>

                        {errors.length > 0 && (
                            <ul className="text-sm text-red-600 space-y-1" role="alert">
                                {errors.map((error) => <li key={error}>{error}</li>)}
                            </ul>
                        )}
                    </>
                )}
            </div>
            {children}
        </div>
    )
}

const formatScore = (score: unknown): string =>
    typeof score === 'number' ? new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 }).format(score) : '-'

/**
 * Spam and danger scores of a submission, shown only when it was classified.
 */
export const WeeblrSubmissionScores: React.FC<{ submission: any }> = ({ submission }) => {
    if (typeof submission?.spamScore !== 'number' && typeof submission?.dangerScore !== 'number') {
        return null
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Spam score</label>
                <p className="text-sm text-gray-900">{formatScore(submission.spamScore)}</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Danger score</label>
                <p className="text-sm text-gray-900">{formatScore(submission.dangerScore)}</p>
            </div>
        </div>
    )
}
