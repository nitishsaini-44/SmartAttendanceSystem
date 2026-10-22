import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';

const statusIcon = (status) => {
    if (status === 'present') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (status === 'late')    return <Clock className="h-4 w-4 text-amber-400" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
};

const statusBg = (status) => {
    if (status === 'present') return 'bg-emerald-500/10 border-emerald-900/50 text-emerald-400';
    if (status === 'late')    return 'bg-amber-500/10 border-amber-900/50 text-amber-400';
    return 'bg-red-500/10 border-red-900/50 text-red-400';
};

// ── Mini progress bar ─────────────────────────────────────────────────────────
const ProgressBar = ({ pct, threshold }) => {
    const color = pct >= threshold ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            {/* Threshold marker */}
            <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: `${threshold}%` }} />
        </div>
    );
};

// ── Subject accordion ─────────────────────────────────────────────────────────
const SubjectSection = ({ subject, records, conducted, attended, missed, percentage, threshold, belowThreshold }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {/* Header */}
            <button onClick={() => setOpen(o => !o)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{subject?.name}</p>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{subject?.code}</span>
                        {belowThreshold && (
                            <span className="flex items-center gap-1 rounded-full bg-red-950/60 border border-red-900/50 px-2 py-0.5 text-xs text-red-400">
                                <AlertTriangle className="h-3 w-3" /> Below {threshold}%
                            </span>
                        )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
                        <span>{conducted} classes</span>
                        <span className="text-emerald-400">{attended} present</span>
                        <span className="text-red-400">{missed} absent</span>
                        <span className="font-medium text-white">{percentage !== null ? `${percentage}%` : '–'}</span>
                    </div>
                    {percentage !== null && (
                        <div className="mt-2">
                            <ProgressBar pct={percentage} threshold={threshold} />
                        </div>
                    )}
                </div>
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform duration-200 ml-3 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Record list */}
            {open && (
                <div className="border-t border-zinc-800">
                    {records.length === 0 ? (
                        <p className="py-6 text-center text-sm text-zinc-500">No sessions recorded yet.</p>
                    ) : (
                        <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
                            {records.map((r, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                    {statusIcon(r.status)}
                                    <div className="flex-1">
                                        <p className="text-sm text-zinc-200">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        {r.sessionLabel && <p className="text-xs text-zinc-500">{r.sessionLabel}</p>}
                                    </div>
                                    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusBg(r.status)}`}>
                                        {r.status}
                                    </span>
                                    {r.source === 'face' && (
                                        <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-xs text-blue-400">Face</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const StudentAttendanceView = () => {
    const location = useLocation();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');

    useEffect(() => {
        api.get('/student/attendance')
            .then(r => { if (r.data.success) setAttendance(r.data.attendance); })
            .catch(() => setError('Failed to load attendance'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
    );

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-white">My Attendance</h1>
                <p className="text-sm text-zinc-400">Subject-wise attendance records</p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">{error}</div>
            )}

            {attendance.length === 0 && !error ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-16 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-zinc-600" />
                    <p className="mt-4 text-zinc-400">No attendance records yet.</p>
                    <p className="text-sm text-zinc-500">Enroll in subjects and attend classes to see records here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {attendance.map(item => (
                        <SubjectSection
                            key={item.enrollment?.id}
                            subject={item.enrollment?.subject}
                            records={item.records}
                            conducted={item.totalSessions}
                            attended={item.attended}
                            missed={item.missed}
                            percentage={item.percentage}
                            threshold={item.threshold}
                            belowThreshold={item.belowThreshold}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentAttendanceView;
