import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { RequireAuth } from './components/RequireAuth'
import { LandingPage } from './pages/LandingPage'
// [weeblr] Fork-only signup page, requiring email verification
import { WeeblrSignupPage as SignupPage } from './pages/WeeblrSignupPage'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { DashboardPage } from './pages/DashboardPage'
import { FormsPage } from './pages/FormsPage'
import { FormBuilderPage } from './pages/FormBuilderPage'
import { FormDetailsPage } from './pages/FormDetailsPage'
// [weeblr] Fork-only Profile and Settings pages
import { WeeblrProfilePage as ProfilePage } from './pages/dashboard/WeeblrProfilePage'
import { WeeblrSettingsPage } from './pages/dashboard/WeeblrSettingsPage'
// [weeblr] Private instance routing
import { WeeblrHomeRedirect, WeeblrAccountsRoute } from './components/WeeblrRoutes'

function AppContent() {
    const location = useLocation()
    const isDashboardRoute = location.pathname.startsWith('/dashboard')

    return (
        <div className="min-h-screen bg-gray-50">
            {!isDashboardRoute && <Navbar />}
            <div className={!isDashboardRoute ? 'pt-16' : ''}>
                <Routes>
                    {/* [weeblr] No landing page, signup only when accounts are enabled */}
                    <Route path="/" element={<WeeblrHomeRedirect />} />
                    <Route path="/signup" element={<WeeblrAccountsRoute><SignupPage /></WeeblrAccountsRoute>} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route
                        path="/dashboard"
                        element={
                            <RequireAuth>
                                <DashboardPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/dashboard/forms"
                        element={
                            <RequireAuth>
                                <FormsPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/dashboard/forms/new"
                        element={
                            <RequireAuth>
                                <FormBuilderPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/dashboard/forms/:id/edit"
                        element={
                            <RequireAuth>
                                <FormBuilderPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/dashboard/forms/:id"
                        element={
                            <RequireAuth>
                                <FormDetailsPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/dashboard/profile"
                        element={
                            <RequireAuth>
                                <ProfilePage />
                            </RequireAuth>
                        }
                    />
                    {/* [weeblr] Settings page */}
                    <Route
                        path="/dashboard/settings"
                        element={
                            <RequireAuth>
                                <WeeblrAccountsRoute>
                                    <WeeblrSettingsPage />
                                </WeeblrAccountsRoute>
                            </RequireAuth>
                        }
                    />
                    {/* [weeblr] Any other page goes to the dashboard or the sign-in page */}
                    <Route path="*" element={<WeeblrHomeRedirect />} />
                </Routes>
            </div>
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

export default App
