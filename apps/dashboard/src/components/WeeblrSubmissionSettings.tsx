import React, { useMemo } from 'react'
import { useWeeblrConfig } from '../lib/weeblrConfig'

// [weeblr] Per-form submission settings: multiple submissions, language, timezone, confirmation email and its reply-to

export interface WeeblrSubmissionSettingsValue {
    allowMultipleSubmissions: boolean
    language: string
    timezone: string
    sendAutoReply: boolean
    confirmationReplyTo: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEFAULT_LANGUAGE = 'en'
const DEFAULT_TIMEZONE = 'UTC'

/**
 * Settings of a form as edited here, with the backend's defaults.
 */
export const readWeeblrSubmissionSettings = (settings: any): WeeblrSubmissionSettingsValue => ({
    allowMultipleSubmissions: settings?.allowMultipleSubmissions !== false,
    language: typeof settings?.language === 'string' && settings.language ? settings.language : DEFAULT_LANGUAGE,
    timezone: typeof settings?.timezone === 'string' && settings.timezone ? settings.timezone : DEFAULT_TIMEZONE,
    sendAutoReply: settings?.sendAutoReply === true,
    confirmationReplyTo: typeof settings?.confirmationReplyTo === 'string' ? settings.confirmationReplyTo : '',
})

export const weeblrSubmissionSettingsChanged = (value: WeeblrSubmissionSettingsValue, settings: any): boolean => {
    const saved = readWeeblrSubmissionSettings(settings)
    return (Object.keys(saved) as Array<keyof WeeblrSubmissionSettingsValue>).some((key) => saved[key] !== value[key])
}

/**
 * Redirect URLs that only pointed at the built-in page, which now follows the form's language.
 */
export const isBuiltInSuccessUrl = (url: unknown): boolean =>
    typeof url === 'string' && (url.endsWith('/submission-success.html') || url === 'http://localhost:5173/success.html')

const listTimezones = (current: string): string[] => {
    const supported: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? []
    const zones = [DEFAULT_TIMEZONE, ...supported.filter((zone) => zone !== DEFAULT_TIMEZONE)]
    return zones.includes(current) ? zones : [current, ...zones]
}

const Toggle: React.FC<{ checked: boolean, onChange: (checked: boolean) => void, label: string }> = ({ checked, onChange, label }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
            aria-label={label}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
    </label>
)

interface WeeblrSubmissionSettingsProps {
    value: WeeblrSubmissionSettingsValue
    onChange: (value: WeeblrSubmissionSettingsValue) => void
}

export const WeeblrSubmissionSettings: React.FC<WeeblrSubmissionSettingsProps> = ({ value, onChange }) => {
    const config = useWeeblrConfig()
    const timezones = useMemo(() => listTimezones(value.timezone), [value.timezone])
    const languages = config?.languages ?? [{ code: value.language, name: value.language }]
    const update = (patch: Partial<WeeblrSubmissionSettingsValue>) => onChange({ ...value, ...patch })
    const replyTo = value.confirmationReplyTo.trim()
    const isReplyToValid = replyTo === '' || EMAIL_PATTERN.test(replyTo)
    const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500'

    return (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Settings</h3>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="form-language" className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <select
                            id="form-language"
                            value={value.language}
                            onChange={(e) => update({ language: e.target.value })}
                            className={selectClassName}
                        >
                            {languages.map((language) => (
                                <option key={language.code} value={language.code}>{language.name}</option>
                            ))}
                        </select>
                        <p className="mt-1 text-sm text-gray-500">Used for the thank-you and error pages and for all emails about this form.</p>
                    </div>
                    <div>
                        <label htmlFor="form-timezone" className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select
                            id="form-timezone"
                            value={value.timezone}
                            onChange={(e) => update({ timezone: e.target.value })}
                            className={selectClassName}
                        >
                            {timezones.map((zone) => (
                                <option key={zone} value={zone}>{zone}</option>
                            ))}
                        </select>
                        <p className="mt-1 text-sm text-gray-500">Used for dates in emails.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-medium text-gray-900">Send Confirmation Email</div>
                        <div className="text-sm text-gray-500">Email the submitter a short confirmation, to the address entered in the form's "email" field. Anyone can enter any address, so only turn this on when needed.</div>
                    </div>
                    <Toggle checked={value.sendAutoReply} onChange={(sendAutoReply) => update({ sendAutoReply })} label="Send Confirmation Email" />
                </div>

                {value.sendAutoReply && (
                    <div>
                        <label htmlFor="confirmation-reply-to" className="block text-sm font-medium text-gray-700 mb-2">Reply-to address</label>
                        <input
                            id="confirmation-reply-to"
                            type="email"
                            value={value.confirmationReplyTo}
                            onChange={(e) => update({ confirmationReplyTo: e.target.value })}
                            placeholder="Leave empty for a no-reply address"
                            autoComplete="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        />
                        {!isReplyToValid && (
                            <p className="mt-1 text-sm text-red-600" role="alert">This is not a valid email address.</p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">Where replies to confirmation emails go. When empty, replies go to a no-reply address on your sending domain.</p>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-medium text-gray-900">Allow Multiple Submissions</div>
                        <div className="text-sm text-gray-500">When off, a visitor (IP address) can only submit once per hour.</div>
                    </div>
                    <Toggle checked={value.allowMultipleSubmissions} onChange={(allowMultipleSubmissions) => update({ allowMultipleSubmissions })} label="Allow Multiple Submissions" />
                </div>
            </div>
        </div>
    )
}
