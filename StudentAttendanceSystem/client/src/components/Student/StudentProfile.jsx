import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, BookOpen, GraduationCap, Loader2, Key, LogOut, ChevronRight, Hash, Calendar, CheckCircle2 } from 'lucide-react';

const StudentProfile = () => {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/student/profile')
            .then(r => { if (r.data.success) setProfile(r.data.student); })
            .finally(() => setLoading(false));
    }, []);

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to sign out?')) {
            logout();
        }
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
    );

    const p = profile;

    return (
        <div className="max-w-xl space-y-6 page-enter">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white tracking-tight">My Profile</h1>
                <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                </button>
            </div>

            {/* Avatar & Header */}
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
                {p?.profilePhoto ? (
                    <img src={`http://localhost:5000${p.profilePhoto}`} alt="Profile"
                        className="h-20 w-20 rounded-2xl object-cover border border-zinc-700" />
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700">
                        <User className="h-10 w-10 text-zinc-400" />
                    </div>
                )}
                <div>
                    <p className="text-xl font-bold text-white">{p?.name || user?.name}</p>
                    <p className="font-mono text-sm text-zinc-400 mt-0.5">{p?.studentId}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="inline-block rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                            Student Account
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                    </div>
                </div>
            </div>

            {/* Academic Details */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden shadow-sm">
                {[
                    { icon: Mail,          label: 'Email',         value: p?.email || user?.email },
                    { icon: Hash,          label: 'Roll / ID',     value: p?.studentId || '–' },
                    { icon: BookOpen,      label: 'Branch',        value: p?.branch || '–' },
                    { icon: Calendar,      label: 'Academic Year', value: p?.academicYear ? `Year ${p.academicYear}` : '–' },
                    { icon: GraduationCap, label: 'Section',       value: p?.section ? `${p.section}${p?.subsection && p?.subsection !== 'ALL' ? ` (${p.subsection})` : ''}` : '–' },
                    { icon: BookOpen,      label: 'Batch Class',   value: p?.class || '–' },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 px-5 py-3.5">
                        <Icon className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                        <span className="w-28 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
                        <span className="text-sm font-medium text-white">{value}</span>
                    </div>
                ))}
            </div>

            {/* Security & Settings (Merged) */}
            <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Account Settings & Security</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                        to="/change-password"
                        className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-850 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-zinc-800 p-2.5 text-amber-400 group-hover:bg-amber-500/10 transition-colors">
                                <Key className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">Change Password</h4>
                                <p className="text-xs text-zinc-400">Update login password</p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="group text-left flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-zinc-800 p-2.5 text-zinc-400 group-hover:text-red-400 group-hover:bg-red-500/20 transition-colors">
                                <LogOut className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white group-hover:text-red-300">Sign Out</h4>
                                <p className="text-xs text-zinc-400">Exit current session</p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            <p className="text-xs text-zinc-500 text-center pt-2">
                To update your enrolled branch, section, or student ID, contact your institution administrator.
            </p>
        </div>
    );
};

export default StudentProfile;
