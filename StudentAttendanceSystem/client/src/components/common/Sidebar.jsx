import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    ClipboardCheck,
    User,
    ChevronRight,
    GraduationCap,
    X,
    BarChart3,
    ShieldCheck,
    UserCheck,
    CalendarCheck
} from 'lucide-react';

// ── Navigation definitions per role ──────────────────────────────────────────

const adminLinks = [
    { to: '/admin/dashboard',    label: 'Dashboard',        icon: LayoutDashboard },
    { to: '/admin/teachers',     label: 'Teachers',         icon: UserCheck },
    { to: '/admin/students',     label: 'Students',         icon: Users },
    { to: '/admin/attendance',   label: 'Attendance',       icon: CalendarCheck },
    { to: '/admin/audit-logs',   label: 'Audit Logs',       icon: ShieldCheck },
];

const teacherLinks = [
    { to: '/dashboard',          label: 'Dashboard',        icon: LayoutDashboard },
    { to: '/students',           label: 'Students',         icon: Users },
    { to: '/attendance',         label: 'Attendance',       icon: ClipboardCheck },
];

const studentLinks = [
    { to: '/student/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
    { to: '/student/attendance', label: 'My Attendance',    icon: CalendarCheck },
    { to: '/student/reports',    label: 'Reports',          icon: BarChart3 },
];

// ─────────────────────────────────────────────────────────────────────────────

const Sidebar = ({ isOpen, onClose }) => {
    const { isAuthenticated, role, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) return null;

    const links =
        role === 'admin'   ? adminLinks   :
        role === 'student' ? studentLinks :
        teacherLinks;

    const profilePath =
        role === 'admin'   ? '/admin/profile'   :
        role === 'student' ? '/student/profile' :
        '/profile';

    const isActive = (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`);

    const handleLinkClick = () => { if (onClose) onClose(); };

    const roleLabel =
        role === 'admin'   ? 'Administrator' :
        role === 'student' ? 'Student Portal' :
        'Teacher Portal';

    const roleBadgeColor =
        role === 'admin'   ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
        role === 'student' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'   :
        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

    return (
        <>
            {/* Mobile overlay backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 w-72 border-r border-zinc-800 bg-zinc-950 px-4 py-6
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <Link
                            to={role === 'admin' ? '/admin/dashboard' : role === 'student' ? '/student/dashboard' : '/dashboard'}
                            onClick={handleLinkClick}
                            className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex-1"
                        >
                            <div className="rounded-xl bg-white p-2 text-black flex-shrink-0">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400">Smart</p>
                                <p className="font-semibold text-white text-sm">Attendance System</p>
                            </div>
                        </Link>

                        <button
                            onClick={onClose}
                            className="ml-2 flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white lg:hidden"
                            aria-label="Close sidebar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Role badge */}
                    <div className={`mb-4 rounded-xl border px-3 py-1.5 text-xs font-medium ${roleBadgeColor}`}>
                        {roleLabel} — {user?.name || ''}
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-1 overflow-y-auto flex-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const active = isActive(link.to);
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={handleLinkClick}
                                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                        active
                                            ? 'border-zinc-700 bg-zinc-800 text-white'
                                            : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100'
                                    }`}
                                >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Profile Button (replaces Settings and Logout) */}
                    <div className="mt-auto border-t border-zinc-800 pt-3">
                        <Link
                            to={profilePath}
                            onClick={handleLinkClick}
                            className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-all duration-200 group ${
                                isActive(profilePath)
                                    ? 'border-zinc-700 bg-zinc-800 text-white shadow-sm'
                                    : 'border-zinc-800/80 bg-zinc-900/90 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
                            }`}
                        >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 group-hover:border-blue-500/40 group-hover:text-blue-300 transition-colors">
                                <User className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                                    {user?.name || 'My Profile'}
                                </p>
                                <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                                    <span className="capitalize">{role || 'User'}</span> • Profile
                                </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;