import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, CalendarCheck, AlertTriangle, TrendingUp, Loader2, ChevronRight, User } from 'lucide-react';

// ── Attendance ring ────────────────────────────────────────────────────────────
const AttendanceRing = ({ pct, size = 80 }) => {
    const r = 30;
    const circ = 2 * Math.PI * r;
    const fill = pct !== null ? circ - (pct / 100) * circ : circ;
    const color =
        pct === null    ? '#52525b' :
        pct >= 75       ? '#34d399' :
        pct >= 60       ? '#f59e0b' : '#f87171';

    return (
        <svg width={size} height={size} viewBox="0 0 70 70">
            <circle cx="35" cy="35" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
            <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="6"
                strokeDasharray={circ} strokeDashoffset={fill}
                strokeLinecap="round" transform="rotate(-90 35 35)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            <text x="35" y="39" textAnchor="middle" fill={color} fontSize="13" fontWeight="700">
                {pct !== null ? `${pct}%` : '–'}
            </text>
        </svg>
    );
};

// ── Subject card ───────────────────────────────────────────────────────────────
const SubjectCard = ({ subject }) => {
    const isLow = subject.belowThreshold;
    return (
        <Link to="/student/attendance" state={{ subjectId: subject.subjectId }}
            className="group block rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800/70">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">{subject.subjectName}</p>
                    <p className="text-xs text-zinc-500">{subject.subjectCode}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{subject.className} · {subject.academicSession}</p>
                    {subject.teacherName && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-300">
                            <User className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="font-medium truncate">{subject.teacherName}</span>
                        </p>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        {[
                            { label: 'Total', value: subject.conducted, color: 'text-zinc-300' },
                            { label: 'Present', value: subject.attended, color: 'text-emerald-400' },
                            { label: 'Absent',  value: subject.missed,  color: 'text-red-400' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="rounded-xl bg-zinc-800/60 py-1.5">
                                <p className={`text-base font-bold ${color}`}>{value}</p>
                                <p className="text-xs text-zinc-500">{label}</p>
                            </div>
                        ))}
                    </div>

                    {isLow && (
                        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs text-red-400">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            Below {subject.threshold}% minimum
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0">
                    <AttendanceRing pct={subject.percentage} />
                </div>
            </div>
        </Link>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const StudentDashboard = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    useEffect(() => {
        api.get('/student/attendance/summary')
            .then(r => { if (r.data.success) setSummary(r.data.summary); })
            .catch(() => setError('Failed to load attendance summary'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
    );

    const belowThresholdCount = summary?.subjects?.filter(s => s.belowThreshold).length ?? 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="mt-1 text-sm text-zinc-400">Your attendance overview</p>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">{error}</div>
            )}

            {/* Overall stat cards */}
            {summary && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { label: 'Overall', value: summary.overallPercentage !== null ? `${summary.overallPercentage}%` : '–', color: summary.overallPercentage >= 75 ? 'text-emerald-400' : 'text-red-400', icon: TrendingUp },
                        { label: 'Classes Held',   value: summary.totalConducted, color: 'text-white', icon: CalendarCheck },
                        { label: 'Classes Attended', value: summary.totalAttended,  color: 'text-emerald-400', icon: CalendarCheck },
                        { label: 'Low Attendance', value: belowThresholdCount, color: belowThresholdCount > 0 ? 'text-red-400' : 'text-zinc-400', icon: AlertTriangle },
                    ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-zinc-500">{label}</p>
                                    <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
                                </div>
                                <Icon className="h-5 w-5 text-zinc-600" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Warning banner if any subject is below threshold */}
            {belowThresholdCount > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-900/50 bg-amber-950/30 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                    <div>
                        <p className="font-medium text-amber-300">Attendance Warning</p>
                        <p className="mt-0.5 text-sm text-amber-400/80">
                            You are below the minimum attendance threshold in {belowThresholdCount} subject{belowThresholdCount > 1 ? 's' : ''}.
                            Attend more classes to avoid academic issues.
                        </p>
                    </div>
                </div>
            )}

            {/* Subject cards */}
            {summary && (
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Your Subjects</h2>
                        <Link to="/student/attendance" className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
                            View all <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {summary.subjects?.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center">
                            <BookOpen className="mx-auto h-8 w-8 text-zinc-600" />
                            <p className="mt-3 text-sm text-zinc-400">No subjects enrolled yet.</p>
                            <p className="text-xs text-zinc-500">Contact your administrator to enroll in subjects.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {summary.subjects.map(s => <SubjectCard key={s.subjectId} subject={s} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
