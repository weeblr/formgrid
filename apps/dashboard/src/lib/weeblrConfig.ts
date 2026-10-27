// [weeblr] Instance settings, fixed when the dashboard is built

export interface WeeblrLanguage {
    code: string
    name: string
}

export interface WeeblrConfig {
    enableAccounts: boolean
    languages: WeeblrLanguage[]
}

/**
 * Same list as LANGUAGES in packages/api/src/weeblr/i18n/index.ts: keep both in step.
 */
const languages: WeeblrLanguage[] = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
]

/**
 * Account creation and deletion, from ENABLE_ACCOUNTS at build time.
 */
const config: WeeblrConfig = {
    enableAccounts: (import.meta as any).env?.VITE_ENABLE_ACCOUNTS === 'true',
    languages,
}

/**
 * Instance settings.
 */
export const useWeeblrConfig = (): WeeblrConfig => config
