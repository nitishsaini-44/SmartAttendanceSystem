import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
    Download,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    Calendar,
    BookOpen,
    ShieldCheck,
    Clock,
    FileText,
    Loader2,
    CalendarCheck,
    Award
} from 'lucide-react';

const StudentReports = () => {
    const { user } = useAuth();
    const [attendanceData, setAttendanceData] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/student/attendance'),
            api.get('/student/profile')
        ])
            .then(([attRes, profRes]) => {
                if (attRes.data.success) setAttendanceData(attRes.data.attendance || []);
                if (profRes.data.success) setProfile(profRes.data.student || null);
            })
            .catch(() => setError('Failed to load attendance report'))
            .finally(() => setLoading(false));
    }, []);

    // ── Metrics Calculations ──────────────────────────────────────────────────
    let totalConducted = 0;
    let totalAttended = 0;
    let totalFace = 0;
    let totalManual = 0;
    const allSessions = [];

    attendanceData.forEach(item => {
        totalConducted += item.totalSessions || 0;
        totalAttended += item.attended || 0;
        (item.records || []).forEach(r => {
            allSessions.push({
                ...r,
                subjectName: item.enrollment?.subject?.name || 'Subject',
                subjectCode: item.enrollment?.subject?.code || '–',
                className: item.enrollment?.class?.name || '–'
            });
            if (r.source === 'face') totalFace++;
            else totalManual++;
        });
    });

    const totalMissed = totalConducted - totalAttended;
    const overallPercentage = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : null;
    const minThreshold = 75;
    const isEligible = overallPercentage !== null && overallPercentage >= minThreshold;

    // Calculate classes needed to reach 75% or safe classes that can be missed
    let eligibilityInsight = '';
    let insightType = 'neutral';

    if (totalConducted > 0) {
        if (overallPercentage < minThreshold) {
            // Need: (attended + X) / (conducted + X) >= 0.75  =>  0.25*X >= 0.75*conducted - attended
            const needed = Math.ceil((0.75 * totalConducted - totalAttended) / 0.25);
            eligibilityInsight = `You need to attend the next ${needed} consecutive class${needed > 1 ? 'es' : ''} to reach the 75% minimum exam eligibility threshold.`;
            insightType = 'danger';
        } else {
            // Safe to miss: (attended) / (conducted + Y) >= 0.75  =>  0.75*Y <= attended - 0.75*conducted
            const safeToMiss = Math.floor((totalAttended - 0.75 * totalConducted) / 0.75);
            if (safeToMiss > 0) {
                eligibilityInsight = `You can afford to miss up to ${safeToMiss} class${safeToMiss > 1 ? 'es' : ''} and still maintain 75% examination eligibility.`;
                insightType = 'safe';
            } else {
                eligibilityInsight = `You are currently right at the 75% requirement. Attend upcoming classes to avoid shortages.`;
                insightType = 'warning';
            }
        }
    }

    // Monthly breakdown aggregation
    const monthlyMap = new Map();
    allSessions.forEach(s => {
        const d = new Date(s.date);
        const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { month: monthKey, conducted: 0, attended: 0 });
        }
        const m = monthlyMap.get(monthKey);
        m.conducted++;
        if (s.status === 'present') m.attended++;
    });
    const monthlyBreakdown = Array.from(monthlyMap.values());

    // Missed sessions log
    const missedSessions = allSessions.filter(s => s.status !== 'present');

    // CSV Exporter
    const handleDownloadCSV = () => {
        if (allSessions.length === 0) return;
        const headers = ['Date', 'Subject', 'Subject Code', 'Class', 'Session', 'Status', 'Method', 'Teacher'];
        const rows = allSessions.map(s => [
            new Date(s.date).toLocaleDateString(),
            `"${s.subjectName || ''}"`,
            s.subjectCode || '',
            `"${s.className || ''}"`,
            `"${s.sessionLabel || ''}"`,
            s.status || 'absent',
            s.source || 'manual',
            `"${s.teacherName || ''}"`
        ]);

        const studentMeta = [
            `# Attendance Report for ${profile?.name || user?.name || 'Student'}`,
            `# Roll No: ${profile?.studentId || '–'}`,
            `# Branch: ${profile?.branch || '–'} | Section: ${profile?.section || '–'} | Year: ${profile?.academicYear || '–'}`,
            `# Generated On: ${new Date().toLocaleString()}`,
            `# Overall Attendance: ${overallPercentage !== null ? overallPercentage + '%' : '–'} (${totalAttended}/${totalConducted} classes)`,
            ''
        ].join('\n');

        const csvContent = studentMeta + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Report_${profile?.studentId || 'Student'}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Analytics & Reports</h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        Academic attendance audit, examination eligibility, and official transcript export
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleDownloadCSV}
                        disabled={allSessions.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export CSV Report</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Exam Eligibility Banner */}
            {totalConducted > 0 && (
                <div className={`rounded-2xl border p-5 ${
                    isEligible
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                        : 'border-red-500/30 bg-red-950/20 text-red-300'
                }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className={`mt-0.5 rounded-xl p-2.5 ${
                                isEligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                                {isEligible ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-white">
                                        {isEligible ? 'Examination Eligible' : 'Shortage of Attendance Alert'}
                                    </h3>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        isEligible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                    }`}>
                                        Current: {overallPercentage}% (Min {minThreshold}%)
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-zinc-300 leading-relaxed">
                                    {eligibilityInsight}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-center border-t md:border-t-0 md:border-l border-zinc-700/50 pt-3 md:pt-0 md:pl-5">
                            <div className="text-right">
                                <span className="text-xs text-zinc-400">Status</span>
                                <p className={`text-sm font-bold ${isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isEligible ? 'Cleared for Exams' : 'Action Required'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-zinc-400">Overall Attendance</p>
                        <TrendingUp className="h-4 w-4 text-zinc-500" />
                    </div>
                    <p className={`mt-2 text-2xl font-bold ${
                        overallPercentage === null ? 'text-zinc-400' : overallPercentage >= 75 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                        {overallPercentage !== null ? `${overallPercentage}%` : '–'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{totalAttended} of {totalConducted} classes attended</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-zinc-400">Total Classes Held</p>
                        <CalendarCheck className="h-4 w-4 text-zinc-500" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-white">{totalConducted}</p>
                    <p className="mt-1 text-xs text-zinc-500">Across all enrolled subjects</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-zinc-400">Classes Attended</p>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-emerald-400">{totalAttended}</p>
                    <p className="mt-1 text-xs text-zinc-500">{totalMissed} class(es) missed</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-zinc-400">Biometric Verification</p>
                        <ShieldCheck className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-blue-400">
                        {allSessions.length > 0 ? Math.round((totalFace / allSessions.length) * 100) : 0}%
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{totalFace} Face / {totalManual} Manual</p>
                </div>
            </div>

            {/* Subject Audit & Eligibility Table */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm">
                <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-white">Subject-wise Eligibility Audit</h2>
                        <p className="text-xs text-zinc-400">Evaluation against 75% university examination criteria</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">{attendanceData.length} Subject(s)</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-zinc-950/80 border-b border-zinc-800 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">Subject</th>
                                <th className="px-4 py-3 text-center">Conducted</th>
                                <th className="px-4 py-3 text-center">Attended</th>
                                <th className="px-4 py-3 text-center">Missed</th>
                                <th className="px-4 py-3 text-center">Percentage</th>
                                <th className="px-4 py-3 text-center">Margin / Needed</th>
                                <th className="px-5 py-3 text-right">Eligibility</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/80">
                            {attendanceData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-zinc-500 text-sm">
                                        No subject attendance data available yet.
                                    </td>
                                </tr>
                            ) : (
                                attendanceData.map(item => {
                                    const subj = item.enrollment?.subject;
                                    const total = item.totalSessions || 0;
                                    const attended = item.attended || 0;
                                    const missed = item.missed || 0;
                                    const pct = item.percentage;
                                    const thresh = item.threshold || 75;
                                    const pass = pct !== null && pct >= thresh;

                                    let marginText = '–';
                                    let marginColor = 'text-zinc-400';
                                    if (total > 0) {
                                        if (pct < thresh) {
                                            const need = Math.ceil((thresh / 100 * total - attended) / (1 - thresh / 100));
                                            marginText = `+${need} needed`;
                                            marginColor = 'text-red-400';
                                        } else {
                                            const safe = Math.floor((attended - (thresh / 100) * total) / (thresh / 100));
                                            marginText = safe > 0 ? `${safe} safe` : 'On edge';
                                            marginColor = safe > 0 ? 'text-emerald-400' : 'text-amber-400';
                                        }
                                    }

                                    return (
                                        <tr key={item.enrollment?.id} className="hover:bg-zinc-800/40 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-white">{subj?.name || 'Subject'}</div>
                                                <div className="text-xs text-zinc-500 font-mono">
                                                    {subj?.code || '–'} · {item.enrollment?.class?.name || 'Class'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center text-zinc-200 font-medium">{total}</td>
                                            <td className="px-4 py-3.5 text-center text-emerald-400 font-semibold">{attended}</td>
                                            <td className="px-4 py-3.5 text-center text-red-400 font-medium">{missed}</td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-block font-bold text-sm ${
                                                    pct === null ? 'text-zinc-500' : pass ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    {pct !== null ? `${pct}%` : '–'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-medium text-xs">
                                                <span className={marginColor}>{marginText}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    pass 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                }`}>
                                                    {pass ? 'Eligible' : 'Shortage'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Monthly Trend & Missed Classes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend Breakdown */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            <h3 className="font-semibold text-white text-sm">Monthly Attendance Trend</h3>
                        </div>
                        <span className="text-xs text-zinc-500">Historical performance</span>
                    </div>

                    {monthlyBreakdown.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-500">No session history recorded.</p>
                    ) : (
                        <div className="space-y-3.5">
                            {monthlyBreakdown.map(m => {
                                const pct = m.conducted > 0 ? Math.round((m.attended / m.conducted) * 100) : 0;
                                return (
                                    <div key={m.month} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-zinc-300">{m.month}</span>
                                            <span className="text-zinc-400 font-mono">
                                                <strong className={pct >= 75 ? 'text-emerald-400' : 'text-red-400'}>{pct}%</strong> ({m.attended}/{m.conducted})
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Missed / Absent Sessions Log */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <h3 className="font-semibold text-white text-sm">Absence Log</h3>
                        </div>
                        <span className="text-xs font-mono text-zinc-400">{missedSessions.length} Missed</span>
                    </div>

                    {missedSessions.length === 0 ? (
                        <div className="py-8 text-center">
                            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400/80 mb-2" />
                            <p className="text-sm font-medium text-zinc-200">Perfect Record!</p>
                            <p className="text-xs text-zinc-500 mt-0.5">You have zero absences on record.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-zinc-800/60">
                            {missedSessions.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                                    <div>
                                        <p className="text-xs font-semibold text-white">{s.subjectName}</p>
                                        <p className="text-[11px] text-zinc-500">
                                            {new Date(s.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                                        Absent
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentReports;
