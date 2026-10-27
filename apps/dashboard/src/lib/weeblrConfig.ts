import { useEffect, useState } from 'react'
import api from './api'

// [weeblr] Instance settings served by GET /api/weeblr/config

export interface WeeblrConfig {
    enableAccounts: boolean
}

const disabledConfig: WeeblrConfig = { enableAccounts: false }

let configPromise: Promise<WeeblrConfig> | null = null

/**
 * Load the settings once per page load. Anything going wrong means accounts stay disabled.
 */
const loadConfig = (): Promise<WeeblrConfig> => {
    if (!configPromise) {
        configPromise = api
            .get('/api/weeblr/config')
            .then((response) => ({ enableAccounts: response.data?.data?.enableAccounts === true }))
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
