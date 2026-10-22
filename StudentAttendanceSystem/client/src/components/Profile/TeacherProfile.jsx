import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, BookOpen, FileText, Edit3, Camera, Lock, ShieldCheck, Key, LogOut, Settings, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Loader from '../common/Loader';
import Card from '../common/Card';

const TeacherProfile = () => {
    const { teacher, user, role, logout, loading } = useAuth();

    if (loading) {
        return <Loader />;
    }

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out of your account?')) {
            logout();
        }
    };

    const profilePhotoUrl = teacher?.profilePhoto
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${teacher.profilePhoto}`
        : null;

    const displayName = teacher?.name || user?.name || 'Faculty Member';
    const displayEmail = teacher?.email || user?.email || '';

    return (
        <div className="space-y-6 page-enter max-w-5xl mx-auto">
            <Card className="overflow-hidden border-zinc-800 bg-zinc-900/80 backdrop-blur">
                <div className="h-32 bg-gradient-to-r from-blue-900/40 via-zinc-900 to-indigo-900/40 border-b border-zinc-800"></div>

                <div className="relative px-6 pb-6">
                    <div className="absolute -top-14 left-6">
                        <div className="relative group">
                            {profilePhotoUrl ? (
                                <img src={profilePhotoUrl} alt="Profile" className="h-28 w-28 rounded-2xl border-4 border-zinc-900 object-cover shadow-xl" />
                            ) : (
                                <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-zinc-900 bg-zinc-800 shadow-xl">
                                    <User className="h-12 w-12 text-zinc-300" />
                                </div>
                            )}
                            <Link 
                                to="/profile/edit" 
                                title="Change photo"
                                className="absolute -bottom-2 -right-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 shadow-lg transition-all duration-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
                            >
                                <Camera className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-4">
                        <Link 
                            to="/change-password" 
                            className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-200 transition-all duration-200 hover:bg-zinc-700 hover:text-white flex items-center gap-2 shadow-sm"
                        >
                            <Key className="h-4 w-4 text-amber-400" />
                            <span>Change Password</span>
                        </Link>
                        <Link 
                            to="/profile/edit" 
                            className="rounded-xl border border-blue-500/30 bg-blue-600/20 px-3.5 py-2 text-xs sm:text-sm font-medium text-blue-200 transition-all duration-200 hover:bg-blue-600/30 hover:border-blue-500/50 flex items-center gap-2 shadow-sm"
                        >
                            <Edit3 className="h-4 w-4 text-blue-400" />
                            <span>Edit Profile</span>
                        </Link>
                        <button 
                            onClick={handleLogout}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs sm:text-sm font-medium text-red-300 transition-all duration-200 hover:bg-red-500/20 hover:border-red-500/50 flex items-center gap-2 shadow-sm"
                            title="Sign out of system"
                        >
                            <LogOut className="h-4 w-4 text-red-400" />
                            <span>Log Out</span>
                        </button>
                    </div>

                    <div className="mt-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-medium text-blue-300 capitalize">
                                <ShieldCheck className="h-3.5 w-3.5" /> {role || 'Faculty'}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">Official authorized account managed by Administration</p>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Email Card (Immutable) */}
                            <div className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/50">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-zinc-800 p-2.5 text-zinc-300">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Email Address</p>
                                            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-400 font-mono">
                                                <Lock className="h-2.5 w-2.5" /> Locked by Admin
                                            </span>
                                        </div>
                                        <p className="mt-1 font-semibold text-zinc-100 break-all">{displayEmail}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Subject Card */}
                            <div className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/50">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-zinc-800 p-2.5 text-zinc-300">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Department / Role</p>
                                        <p className="mt-1 font-semibold text-zinc-100">{teacher?.subject || (role === 'admin' ? 'System Administrator' : 'Academic Faculty')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* About Me */}
                        <div className="mt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-zinc-400" />
                                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">About</h3>
                            </div>
                            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-sm text-zinc-300 leading-relaxed">
                                {teacher?.description || (role === 'admin' ? 'Administrator account with full institutional authority.' : 'No description added yet. Click "Edit Profile" to add faculty bio.')}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Account Settings & Session Management Section (Merged onto Profile) */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Account Settings & Security</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link 
                        to="/profile/edit" 
                        className="group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 transition-all duration-200 hover:bg-zinc-850 hover:border-zinc-700 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-zinc-800 p-3 text-zinc-300 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                                <Edit3 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-100 group-hover:text-white">Edit Profile</h3>
                                <p className="text-xs text-zinc-400 mt-0.5">Update bio and profile photo</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
                            <span>Open Editor</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </Link>

                    <Link 
                        to="/change-password" 
                        className="group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 transition-all duration-200 hover:bg-zinc-850 hover:border-zinc-700 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-zinc-800 p-3 text-zinc-300 group-hover:text-amber-400 group-hover:bg-amber-500/10 transition-colors">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-100 group-hover:text-white">Change Password</h3>
                                <p className="text-xs text-zinc-400 mt-0.5">Update credentials & security</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs font-medium text-amber-400 group-hover:text-amber-300">
                            <span>Change Credentials</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </Link>

                    <button 
                        onClick={handleLogout}
                        className="group text-left rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 transition-all duration-200 hover:bg-red-500/10 hover:border-red-500/30 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-zinc-800 p-3 text-zinc-400 group-hover:text-red-400 group-hover:bg-red-500/20 transition-colors">
                                <LogOut className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-100 group-hover:text-red-300">Log Out</h3>
                                <p className="text-xs text-zinc-400 mt-0.5">End your current active session</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs font-medium text-red-400 group-hover:text-red-300">
                            <span>Sign Out Now</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherProfile;