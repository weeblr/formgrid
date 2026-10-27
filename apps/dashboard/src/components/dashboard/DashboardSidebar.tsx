import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from '../ui/UserAvatar';
// [weeblr] Settings only when accounts are enabled
import { useWeeblrConfig } from '../../lib/weeblrConfig';

interface DashboardSidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
    { name: 'Forms', href: '/dashboard/forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    // [weeblr] Settings page
    { name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export function DashboardSidebar({ open, setOpen }: DashboardSidebarProps) {
    const location = useLocation();
    const weeblrConfig = useWeeblrConfig();
    const { user, logout } = useAuth();

    return (
        <>
            {/* Mobile backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
          fixed py-0 md:py-12 inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
                {/* Mobile close button only - no header text */}
                <div className="flex items-center justify-end py-3 px-6 flex-shrink-0">
                    <button
                        onClick={() => setOpen(false)}
                        className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User info */}
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center">
                        <UserAvatar user={user} size="lg" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                                {user?.profile?.name || user?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="px-6 py-4 flex-1 overflow-y-auto">
                    <ul className="space-y-2">
                        {navigation.filter((item) => item.href !== '/dashboard/settings' || weeblrConfig?.enableAccounts).map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        to={item.href}
                                        className={`
                                      flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                                      ${isActive
                                                ? 'bg-primary-light/20 text-primary-dark'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }
                                    `}
                                        onClick={() => setOpen(false)}
                                    >
                                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                        </svg>
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Sign out button */}
                <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors duration-200"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}
