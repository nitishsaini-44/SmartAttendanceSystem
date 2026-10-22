import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Menu, ChevronRight, Clock } from 'lucide-react';

const getRouteMetadata = (pathname) => {
    if (pathname.includes('/admin/dashboard') || pathname === '/dashboard') return { title: 'Dashboard', section: 'Overview' };
    if (pathname.includes('/attendance')) return { title: 'Attendance Management', section: 'Biometrics' };
    if (pathname.includes('/students')) return { title: 'Student Directory', section: 'Academic Roster' };
    if (pathname.includes('/teachers')) return { title: 'Faculty Management', section: 'Administration' };
    if (pathname.includes('/audit-logs')) return { title: 'Audit Logs', section: 'Security' };
    if (pathname.includes('/profile')) return { title: 'Profile & Settings', section: 'Account' };
    if (pathname.includes('/change-password')) return { title: 'Change Password', section: 'Security' };
    if (pathname.includes('/reports')) return { title: 'Attendance Reports', section: 'Analytics' };
    return { title: 'Portal', section: 'Academic' };
};

const Navbar = ({ onMenuToggle }) => {
    const { teacher, user, role, isAuthenticated } = useAuth();
    const location = useLocation();
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 15000);
        return () => clearInterval(timer);
    }, []);

    if (!isAuthenticated || location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }

    const profilePath =
        role === 'admin'   ? '/admin/profile'   :
        role === 'student' ? '/student/profile' :
        '/profile';

    const routeMeta = getRouteMetadata(location.pathname);

    return (
        <header className="sticky top-0 z-30 bg-zinc-950/60 px-4 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
                {/* Left side: Mobile menu toggle + Dynamic Breadcrumb */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuToggle}
                        className="flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white lg:hidden"
                        aria-label="Open menu"
                        id="sidebar-menu-btn"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Dynamic Breadcrumbs */}
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-zinc-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            <span className="capitalize">{role || 'Faculty'} Portal</span>
                        </span>
                        <ChevronRight className="hidden sm:block h-3.5 w-3.5 text-zinc-600" />
                        <span className="text-zinc-500 hidden md:inline">{routeMeta.section}</span>
                        <ChevronRight className="hidden md:block h-3.5 w-3.5 text-zinc-600" />
                        <span className="font-semibold text-white tracking-wide">{routeMeta.title}</span>
                    </div>
                </div>

                {/* Center / Right utilities & Profile */}
                <div className="flex items-center gap-2.5 sm:gap-3.5">
                    {/* Clock */}
                    {currentTime && (
                        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 font-mono">
                            <Clock className="h-3.5 w-3.5 text-zinc-500" />
                            <span>{currentTime}</span>
                        </div>
                    )}

                    {/* User avatar / profile button */}
                    <Link
                        to={profilePath}
                        title="View Profile & Settings"
                        className="flex flex-shrink-0 items-center gap-2.5 sm:gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 hover:border-zinc-700 hover:bg-zinc-850 transition-all duration-200 group shadow-sm"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 group-hover:border-blue-500/40 group-hover:text-blue-300 transition-colors">
                            <User className="h-4 w-4" />
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors leading-tight">
                                {teacher?.name || user?.name || 'Profile'}
                            </p>
                            <p className="text-[11px] text-zinc-400 capitalize leading-tight">
                                {role || 'Faculty'}
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Navbar;