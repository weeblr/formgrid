import React from 'react'

// [weeblr] Honeypot field name setting, with the markup to add to the form

const DEFAULT_HONEYPOT_FIELD = 'fax'
const HONEYPOT_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,49}$/

interface WeeblrHoneypotFieldProps {
    value: string
    onChange: (value: string) => void
}

export const WeeblrHoneypotField: React.FC<WeeblrHoneypotFieldProps> = ({ value, onChange }) => {
    const trimmed = value.trim()
    const isValid = trimmed === '' || HONEYPOT_FIELD_PATTERN.test(trimmed)
    const fieldName = trimmed !== '' && isValid ? trimmed : DEFAULT_HONEYPOT_FIELD
    const markup = `<div style="position:absolute;left:-10000px" aria-hidden="true">\n  <input type="text" name="${fieldName}" tabindex="-1" autocomplete="off">\n</div>`

    return (
        <div>
            <label htmlFor="honeypot-field" className="block text-sm font-medium text-gray-700 mb-2">
                Honeypot field name
            </label>
            <input
                id="honeypot-field"
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={DEFAULT_HONEYPOT_FIELD}
                maxLength={50}
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            />
            {!isValid && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                    Must start with a letter and contain only letters, digits, _ or -.
                </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
                Use a name that looks like a real field but that your form does not use. Leave empty to use "{DEFAULT_HONEYPOT_FIELD}".
                Add this hidden field to your form and leave it empty. Submissions that fill it are silently discarded.
            </p>
            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-800 overflow-x-auto"><code>{markup}</code></pre>
        </div>
    )
}
