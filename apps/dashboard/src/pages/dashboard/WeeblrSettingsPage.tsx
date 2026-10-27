import React, { useState } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'

// [weeblr] Settings page, only offering account deletion
export const WeeblrSettingsPage: React.FC = () => {
    const { user, logout } = useAuth()
    const [confirmEmail, setConfirmEmail] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const accountEmail = user?.email || ''
    const isConfirmed = accountEmail !== '' && confirmEmail.trim().toLowerCase() === accountEmail.toLowerCase()

    const handleDelete = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!isConfirmed) {
            return
        }

        try {
            setIsDeleting(true)
            setError(null)
            await api.delete('/api/user/me', { data: { email: confirmEmail.trim() } })
            logout()
        } catch (error: any) {
            setError(
                error?.response?.data?.message ||
                'Failed to delete account. Please try again.'
            )
            setIsDeleting(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
                    </div>

                    <div className="px-6 py-6">
                        <h2 className="text-lg font-medium text-red-800">Delete account</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            This permanently deletes your account, all your forms, their submissions and uploaded files. This cannot be undone.
                        </p>

                        <form onSubmit={handleDelete} className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700">
                                    To confirm, type your email address: <span className="font-mono">{accountEmail}</span>
                                </label>
                                <input
                                    id="confirm-email"
                                    type="email"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    autoComplete="off"
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-700" role="alert">{error}</p>
                            )}

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={!isConfirmed || isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete my account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
