import { useEffect, useState } from 'react'
import api from './api'

// [weeblr] Instance settings served by GET /api/weeblr/config

export interface WeeblrLanguage {
    code: string
    name: string
}

export interface WeeblrConfig {
    enableAccounts: boolean
    languages: WeeblrLanguage[]
    defaultLanguage: string
    defaultTimezone: string
}

const disabledConfig: WeeblrConfig = {
    enableAccounts: false,
    languages: [{ code: 'en', name: 'English' }],
    defaultLanguage: 'en',
    defaultTimezone: 'UTC',
}

let configPromise: Promise<WeeblrConfig> | null = null

/**
 * Load the settings once per page load. Anything going wrong means accounts stay disabled.
 */
const loadConfig = (): Promise<WeeblrConfig> => {
    if (!configPromise) {
        configPromise = api
            .get('/api/weeblr/config')
            .then((response) => {
                const data = response.data?.data || {}
                return {
                    enableAccounts: data.enableAccounts === true,
                    languages: Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : disabledConfig.languages,
                    defaultLanguage: typeof data.defaultLanguage === 'string' ? data.defaultLanguage : disabledConfig.defaultLanguage,
                    defaultTimezone: typeof data.defaultTimezone === 'string' ? data.defaultTimezone : disabledConfig.defaultTimezone,
                }
            })
            .catch(() => disabledConfig)
    }
    return configPromise
}

/**
 * Instance settings, null until loaded.
 */
export const useWeeblrConfig = (): WeeblrConfig | null => {
    const [config, setConfig] = useState<WeeblrConfig | null>(null)

    useEffect(() => {
        let isMounted = true
        loadConfig().then((loaded) => {
            if (isMounted) {
                setConfig(loaded)
            }
        })
        return () => {
            isMounted = false
        }
    }, [])

    return config
}
