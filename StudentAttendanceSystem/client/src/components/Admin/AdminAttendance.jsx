import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Loader2, Filter, Pencil, X } from 'lucide-react';

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
        </div>
    </div>
);

const AdminAttendance = () => {
    const [records, setRecords]     = useState([]);
    const [total, setTotal]         = useState(0);
    const [loading, setLoading]     = useState(true);
    const [teachers, setTeachers]   = useState([]);

    // Filters
    const [filterTeacher, setFilterTeacher] = useState('');
    const [fromDate, setFromDate]           = useState('');
    const [toDate,   setToDate]             = useState('');
    const [page, setPage]                   = useState(1);

    // Correction modal
    const [correcting, setCorrecting]     = useState(null);
    const [reason, setReason]             = useState('');
    const [edits, setEdits]               = useState({});
    const [submitting, setSubmitting]     = useState(false);
    const [corrMsg, setCorrMsg]           = useState('');
    const [corrErr, setCorrErr]           = useState('');

    const fetchData = async () => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: 25 });
        if (filterTeacher) params.append('teacherId', filterTeacher);
        if (fromDate)      params.append('fromDate',  fromDate);
        if (toDate)        params.append('toDate',    toDate);

        try {
            const r = await api.get(`/admin/attendance?${params}`);
            if (r.data.success) {
                setRecords(r.data.attendance || []);
                setTotal(r.data.count || 0);
            }
        } catch { /* no-op */ }
        setLoading(false);
    };

    useEffect(() => {
        api.get('/admin/teachers?limit=200')
            .then(tr => {
                if (tr.data.success) setTeachers(tr.data.teachers || []);
            })
            .catch(() => {});
    }, []);

    useEffect(() => { 
        fetchData(); 
    }, [filterTeacher, fromDate, toDate, page]);

    const openCorrect = (rec) => {
        setCorrecting(rec);
        const initial = {};
        (rec.records || []).forEach(r => { initial[r.studentRollNo] = r.status; });
        setEdits(initial);
        setReason('');
        setCorrMsg('');
        setCorrErr('');
    };

    const handleCorrect = async (e) => {
        e.preventDefault();
        if (!reason.trim()) { setCorrErr('Reason is required'); return; }
        setSubmitting(true); setCorrErr('');
        const corrections = Object.entries(edits).map(([studentRollNo, status]) => ({ studentRollNo, status }));
        try {
            const attendanceId = correcting.id || correcting._id;
            const r = await api.put(`/admin/attendance/${attendanceId}/correct`, { records: corrections, reason });
            if (r.data.success) { 
                setCorrMsg('Attendance corrected!'); 
                fetchData(); 
                setTimeout(() => setCorrecting(null), 1500); 
            } else {
                setCorrErr(r.data.message || 'Failed to correct attendance');
            }
        } catch (ex) { 
            setCorrErr(ex.response?.data?.message || 'Error occurred while saving correction'); 
        }
        setSubmitting(false);
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-white">Attendance Records</h1>
                <p className="text-sm text-zinc-400">{total} session(s) across institution</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <select 
                    value={filterTeacher} 
                    onChange={e => { setFilterTeacher(e.target.value); setPage(1); }}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                >
                    <option value="">All Teachers</option>
                    {teachers.map(t => (
                        <option key={t.id || t._id} value={t.id || t._id}>
                            {t.name} {t.email ? `(${t.email})` : ''}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">From:</span>
                    <input 
                        type="date" 
                        value={fromDate} 
                        onChange={e => { setFromDate(e.target.value); setPage(1); }}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none" 
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">To:</span>
                    <input 
                        type="date" 
                        value={toDate} 
                        onChange={e => { setToDate(e.target.value); setPage(1); }}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none" 
                    />
                </div>

                {(filterTeacher || fromDate || toDate) && (
                    <button
                        onClick={() => { setFilterTeacher(''); setFromDate(''); setToDate(''); setPage(1); }}
                        className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Table (Horizontal scroll on mobile) */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
                <table className="min-w-[780px] w-full text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950">
                        <tr>
                            {['Date', 'Teacher', 'Class', 'Subject', 'Session', 'Students', 'Source', 'Correct'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={8} className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" /></td></tr>
                        ) : records.length === 0 ? (
                            <tr><td colSpan={8} className="py-8 text-center text-zinc-500">No records found</td></tr>
                        ) : records.map(rec => {
                            // 1. Teacher name & email resolution
                            const teacherName = rec.teacherName || rec.teacher?.name || rec.teacher?.user?.name || rec.teacherId?.name || '–';
                            const teacherEmail = rec.teacher?.email || rec.teacherId?.email;

                            // 2. Class & section resolution
                            const sampleStudent = rec.records?.find(r => r.student)?.student;
                            const clsName = rec.className || rec.class?.name || sampleStudent?.branch || '';
                            const secName = rec.section || (sampleStudent ? (sampleStudent.subsection && sampleStudent.subsection !== 'ALL' ? sampleStudent.subsection : sampleStudent.section) : '') || '';
                            const classDisplay = rec.classDisplay || (clsName ? (secName ? `${clsName} - ${secName}` : clsName) : (rec.classId?.name || rec.class || '–'));

                            // 3. Subject resolution
                            const subjectDisplay = rec.subjectDisplay || rec.subjectName || rec.subject?.name || rec.subjectId?.name || rec.teacher?.subject || '–';

                            // 4. Session resolution
                            const yearNum = rec.academicYear || sampleStudent?.academicYear;
                            const sessionDisplay = rec.sessionDisplay || rec.sessionLabel || rec.academicSession || (yearNum ? `Year ${yearNum}` : (secName ? `Sec ${secName}` : 'Regular'));

                            const presentCount = rec.presentCount ?? (rec.records?.filter(r => r.status === 'present').length || 0);
                            const totalCount = rec.totalBatchStudents || rec.totalCount || rec.batchTotalStudents || rec.records?.length || 0;
                            const isCorrected = Boolean(rec.correctedById || rec.correctedBy);

                            return (
                                <tr key={rec.id || rec._id} className="hover:bg-zinc-800/40 transition-colors">
                                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                                        {new Date(rec.date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{teacherName}</div>
                                        {teacherEmail && <div className="text-xs text-zinc-400">{teacherEmail}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-zinc-200">
                                            {classDisplay}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block rounded-md bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 text-xs font-medium text-zinc-200">
                                            {subjectDisplay}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-300 font-medium">
                                        {sessionDisplay}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="font-semibold text-emerald-400">{presentCount}P</span>
                                        <span className="mx-1 text-zinc-600">/</span>
                                        <span className="text-zinc-400">{totalCount}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`capitalize rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            rec.source === 'face' 
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                                : rec.source === 'manual' 
                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                        }`}>
                                            {rec.source || 'manual'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {isCorrected && (
                                                <span 
                                                    title={rec.correctionReason ? `Reason: ${rec.correctionReason}` : 'Attendance was corrected'}
                                                    className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-400 font-medium"
                                                >
                                                    Corrected
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => openCorrect(rec)} 
                                                title="Correct attendance record"
                                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-700 transition-colors"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-3">
                <button 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-40 hover:border-zinc-500 transition-colors"
                >
                    ← Prev
                </button>
                <span className="text-sm text-zinc-400">Page {page}</span>
                <button 
                    disabled={records.length < 25} 
                    onClick={() => setPage(p => p + 1)}
                    className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-40 hover:border-zinc-500 transition-colors"
                >
                    Next →
                </button>
            </div>

            {/* Correction Modal */}
            {correcting && (
                <Modal 
                    title={`Correct Attendance — ${new Date(correcting.date).toLocaleDateString()}`} 
                    onClose={() => setCorrecting(null)}
                >
                    <form onSubmit={handleCorrect} className="space-y-4">
                        <div className="rounded-xl bg-zinc-800/60 p-3 border border-zinc-700/60 text-xs text-zinc-400 flex flex-wrap gap-x-5 gap-y-1">
                            <div><span className="text-zinc-500">Teacher:</span> <strong className="text-white">{correcting.teacherName || correcting.teacher?.name || '–'}</strong></div>
                            <div><span className="text-zinc-500">Class:</span> <strong className="text-white">{correcting.classDisplay || correcting.className || '–'}</strong></div>
                            <div><span className="text-zinc-500">Subject:</span> <strong className="text-white">{correcting.subjectDisplay || correcting.subjectName || correcting.teacher?.subject || '–'}</strong></div>
                        </div>

                        {(!correcting.records || correcting.records.length === 0) ? (
                            <div className="py-6 text-center text-sm text-zinc-400">
                                No student records were captured in this session.
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                {correcting.records.map(r => (
                                    <div key={r.studentRollNo} className="flex items-center justify-between rounded-xl border border-zinc-700/70 bg-zinc-800/40 px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium text-white">{r.studentName}</p>
                                            <p className="text-xs text-zinc-400 font-mono">{r.studentRollNo}</p>
                                        </div>
                                        <select
                                            value={edits[r.studentRollNo] || r.status}
                                            onChange={e => setEdits(ed => ({...ed, [r.studentRollNo]: e.target.value}))}
                                            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white focus:border-white focus:outline-none"
                                        >
                                            <option value="present">Present</option>
                                            <option value="absent">Absent</option>
                                            <option value="late">Late</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-300">Reason for correction *</label>
                            <textarea 
                                value={reason} 
                                onChange={e => setReason(e.target.value)} 
                                required 
                                rows={2} 
                                placeholder="State reason for modifying attendance record…"
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" 
                            />
                        </div>
                        {corrErr && <p className="text-sm text-red-400">{corrErr}</p>}
                        {corrMsg && <p className="text-sm text-emerald-400">{corrMsg}</p>}
                        <button 
                            type="submit" 
                            disabled={submitting || !correcting.records || correcting.records.length === 0} 
                            className="w-full rounded-xl bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Saving…' : 'Save Correction'}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default AdminAttendance;
