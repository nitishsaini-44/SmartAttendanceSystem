import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
    Users, UserCheck, ClipboardCheck, Clock, ShieldCheck, User
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, to }) => (
    <Link to={to || '#'} className="group block">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/70">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-zinc-400">{label}</p>
                    <p className="mt-1 text-3xl font-bold text-white">{value ?? '–'}</p>
                </div>
                <div className={`rounded-xl p-3 ${color}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    </Link>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/admin/stats')
            .then(res => { if (res.data.success) setStats(res.data.stats); })
            .catch(() => setError('Failed to load stats'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
    );

    if (error) return (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">{error}</div>
    );

    const cards = [
        { label: 'Active Teachers',   value: stats?.totalTeachers,        icon: UserCheck,      color: 'bg-emerald-500/20 text-emerald-400', to: '/admin/teachers'   },
        { label: 'Active Students',   value: stats?.totalStudents,        icon: Users,          color: 'bg-blue-500/20 text-blue-400',       to: '/admin/students'   },
        { label: "Today's Sessions",  value: stats?.todayAttendanceCount, icon: ClipboardCheck, color: 'bg-pink-500/20 text-pink-400',     to: '/admin/attendance' },
        { label: 'Recent Activity',   value: stats?.recentAuditLogs?.length ?? 0, icon: ShieldCheck, color: 'bg-purple-500/20 text-purple-400', to: '/admin/audit-logs' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-zinc-400">Institution-wide overview and management</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map(c => <StatCard key={c.label} {...c} />)}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="mb-3 text-lg font-semibold text-white">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {[
                        { to: '/admin/teachers',   label: 'Teachers',    icon: UserCheck      },
                        { to: '/admin/students',   label: 'Students',    icon: Users          },
                        { to: '/admin/attendance', label: 'Attendance',  icon: ClipboardCheck },
                        { to: '/admin/audit-logs', label: 'Audit Logs',  icon: ShieldCheck    },
                        { to: '/admin/profile',    label: 'Profile',     icon: User           },
                    ].map(({ to, label, icon: Icon }) => (
                        <Link
                            key={to}
                            to={to}
                            className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-center text-sm text-zinc-300 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Audit Logs */}
            {stats?.recentAuditLogs?.length > 0 && (
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                        <Link to="/admin/audit-logs" className="text-sm text-zinc-400 hover:text-white">View all →</Link>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
                        {stats.recentAuditLogs.map((log, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                                <Clock className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-zinc-200">
                                        <span className="font-medium text-white">{log.actorName}</span>
                                        {' '}
                                        <span className="text-zinc-400">{log.action.replace(/_/g, ' ').toLowerCase()}</span>
                                    </p>
                                </div>
                                <span className="flex-shrink-0 text-xs text-zinc-500">
                                    {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
