import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWeeblrConfig } from '../lib/weeblrConfig'

// [weeblr] Private instance: no public pages, account pages behind ENABLE_ACCOUNTS

/**
 * Sends signed-in users to the dashboard and everyone else to the sign-in page.
 */
export const WeeblrHomeRedirect: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return null
    }

    return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

/**
 * Renders its children only when account creation and deletion are enabled.
 */
export const WeeblrAccountsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const config = useWeeblrConfig()

    if (!config.enableAccounts) {
        return <WeeblrHomeRedirect />
    }

    return <>{children}</>
}
