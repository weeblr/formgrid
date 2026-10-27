import React, { useState, useEffect } from 'react'
import api from '../../lib/api'
import { DashboardLayout } from '../../layouts/DashboardLayout'

// User profile interface
interface UserProfile {
    id: string
    email: string
    isEmailVerified: boolean
    profile?: {
        name?: string
        bio?: string
        avatarUrl?: string
        website?: string
    }
}

// [weeblr] Copy of ProfilePage with editable name and website
export const WeeblrProfilePage: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [website, setWebsite] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Fetch user profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true)
                const response = await api.get('/api/user/me')
                const userData = response.data.data
                setUser(userData)
                setName(userData.profile?.name || '')
                setWebsite(userData.profile?.website || '')
            } catch (error: any) {
                console.error('Failed to fetch profile:', error)
                setError(
                    error?.response?.data?.message ||
                    'Failed to load profile. Please try again.'
                )
            } finally {
                setIsLoading(false)
            }
        }

        fetchProfile()
    }, [])

    // Save name and website. The API clears any field it does not receive,
    // so bio and avatar are sent back unchanged.
    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!user) {
            return
        }

        try {
            setIsSaving(true)
            setSaveError(null)
            setSaveSuccess(false)
            const response = await api.put('/api/user/me/profile', {
                name: name.trim() || null,
                website: website.trim() || null,
                bio: user.profile?.bio || null,
                avatarUrl: user.profile?.avatarUrl || null,
            })
            const userData = response.data.data
            setUser(userData)
            setName(userData.profile?.name || '')
            setWebsite(userData.profile?.website || '')
            setSaveSuccess(true)
        } catch (error: any) {
            setSaveError(
                error?.response?.data?.errors?.[0]?.message ||
                error?.response?.data?.message ||
                'Failed to save profile. Please try again.'
            )
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    if (!user) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-gray-500">No profile data available.</p>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h1 className="text-2xl font-semibold text-gray-900">Profile Information</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            View your account information and profile details.
                        </p>
                    </div>

                    <div className="px-6 py-6 space-y-6">
                        {/* Avatar Display */}
                        {user.profile?.avatarUrl && (
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                    <img
                                        className="h-16 w-16 rounded-full object-cover"
                                        src={user.profile.avatarUrl}
                                        alt="Profile avatar"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
                                    <p className="text-sm text-gray-500">Your current profile picture</p>
                                </div>
                            </div>
                        )}

                        {/* User Information */}
                        <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {/* Name */}
                            <div>
                                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">Full name</label>
                                <input
                                    id="profile-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={100}
                                    autoComplete="name"
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                <div className="mt-1 text-sm text-gray-900">{user.email}</div>
                                <div className="mt-1 flex items-center">
                                    {user.isEmailVerified ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Unverified
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Bio</label>
                                <div className="mt-1 text-sm text-gray-900">
                                    {user.profile?.bio || 'No bio provided'}
                                </div>
                            </div>

                            {/* Website */}
                            <div className="sm:col-span-2">
                                <label htmlFor="profile-website" className="block text-sm font-medium text-gray-700">Website</label>
                                <input
                                    id="profile-website"
                                    type="url"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    maxLength={200}
                                    placeholder="https://example.com"
                                    autoComplete="url"
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>

                            {/* Save */}
                            <div className="sm:col-span-2 flex items-center justify-end gap-4">
                                {saveError && (
                                    <p className="text-sm text-red-700" role="alert">{saveError}</p>
                                )}
                                {saveSuccess && (
                                    <p className="text-sm text-green-700" role="status">Profile saved.</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>

                        {/* Account Information */}
                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">User ID</label>
                                    <div className="mt-1 text-sm text-gray-900 font-mono">{user.id}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Account Status</label>
                                    <div className="mt-1">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}