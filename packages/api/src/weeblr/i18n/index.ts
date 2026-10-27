import { en, MessageKey, Messages } from './en';
import { fr } from './fr';

// [weeblr] Form languages. To add one: create its file with the same keys as en.ts,
// then list it in LANGUAGES with the locale used to format dates.

export interface Language {
    code: string;
    name: string;
    locale: string;
}

export const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', locale: 'en-GB' },
    { code: 'fr', name: 'Français', locale: 'fr-FR' },
];

const MESSAGES: Record<string, Messages> = { en, fr };

export const DEFAULT_LANGUAGE = 'en';

export const isSupportedLanguage = (code: unknown): code is string =>
    typeof code === 'string' && LANGUAGES.some((language) => language.code === code);

/**
 * Text in the given language, English when missing, with {placeholders} replaced.
 */
export const t = (languageCode: string, key: MessageKey, params: Record<string, string> = {}): string => {
    const text = MESSAGES[languageCode]?.[key] || en[key];
    return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? (params[name] as string) : match));
};

export const getLocale = (languageCode: string): string =>
    LANGUAGES.find((language) => language.code === languageCode)?.locale || 'en-GB';

export type { MessageKey };
