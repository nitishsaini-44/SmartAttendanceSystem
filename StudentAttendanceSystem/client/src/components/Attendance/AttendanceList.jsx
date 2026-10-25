import React, { useEffect, useState, useMemo } from 'react';
import attendanceService, { isSessionMatchingBatch } from '../../services/attendanceService';
import studentService from '../../services/studentService';
import { Clock, Download, ClipboardList, Trash2, Users } from 'lucide-react';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const formatAcademicYear = (yr) => {
    if (!yr) return '–';
    const num = parseInt(yr, 10);
    if (num === 1) return '1st Year';
    if (num === 2) return '2nd Year';
    if (num === 3) return '3rd Year';
    if (num === 4) return '4th Year';
    return `${num}th Year`;
};

const AttendanceList = ({ selectedBatch }) => {
    const [sessions, setSessions] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTodayAttendance();
    }, [selectedBatch]);

    const fetchTodayAttendance = async () => {
        try {
            setLoading(true);
            const params = selectedBatch ? {
                branch: selectedBatch.branch,
                section: selectedBatch.section,
                subsection: selectedBatch.subsection,
                academicYear: selectedBatch.academicYear
            } : {};
            const [attRes, stuRes] = await Promise.all([
                attendanceService.getTodayAttendance(params).catch(() => ({ sessions: [], attendance: [] })),
                studentService.getAllStudents().catch(() => ({ students: [] }))
            ]);

            const list = attRes.sessions || attRes.attendance || [];
            setSessions(list);
            setAllStudents(stuRes.students || []);
        } catch (error) {
            toast.error('Failed to fetch attendance');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const params = selectedBatch ? {
                branch: selectedBatch.branch,
                section: selectedBatch.section,
                subsection: selectedBatch.subsection,
                academicYear: selectedBatch.academicYear
            } : {};
            const blob = await attendanceService.downloadTodayAttendanceCSV(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const batchTag = selectedBatch ? `_${selectedBatch.branch}_${selectedBatch.section}_${selectedBatch.subsection}` : '';
            a.download = `attendance_${new Date().toISOString().split('T')[0]}${batchTag}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('CSV downloaded successfully');
        } catch (error) {
            toast.error('Failed to download CSV. Make sure attendance is marked first.');
        }
    };

    const handleReset = async () => {
        const batchName = selectedBatch ? `${selectedBatch.branch}-${selectedBatch.section} (${selectedBatch.subsection})` : 'today';
        if (!window.confirm(`Are you sure you want to reset attendance for ${batchName}? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const params = selectedBatch ? {
                branch: selectedBatch.branch,
                section: selectedBatch.section,
                subsection: selectedBatch.subsection
            } : {};
            const response = await attendanceService.resetTodayAttendance(params);
            toast.success(response.message);
            fetchTodayAttendance();
        } catch (error) {
            toast.error('Failed to reset attendance');
        }
    };

    // Map all students by id and roll number for 100% authoritative matching
    const studentMap = useMemo(() => {
        const map = new Map();
        allStudents.forEach(s => {
            if (s.id) map.set(s.id, s);
            if (s._id) map.set(s._id, s);
            if (s.studentId) map.set(s.studentId, s);
        });
        return map;
    }, [allStudents]);

    // Flatten, deduplicate, and strictly scope records to selectedBatch ONLY
    const { batchRecords, filteredRecords, presentCount, absentCount } = useMemo(() => {
        // Only consider attendance sessions that specifically belong to the active selected batch
        const matchingSessions = selectedBatch 
            ? sessions.filter(sess => isSessionMatchingBatch(sess, selectedBatch))
            : sessions;

        const rawList = [];
        matchingSessions.forEach(sess => {
            (sess.records || []).forEach(record => {
                rawList.push({
                    ...record,
                    sessionId: sess.id,
                    sessionClass: sess.className,
                    sessionSection: sess.section,
                    sessionSource: sess.source || 'manual'
                });
            });
        });

        // Deduplicate records per student (prioritize 'present' and latest timestamp)
        const recordMap = new Map();
        rawList.forEach(r => {
            const key = r.studentRollNo || r.studentId;
            const existing = recordMap.get(key);
            if (!existing) {
                recordMap.set(key, r);
            } else if (r.status === 'present' && existing.status !== 'present') {
                recordMap.set(key, r);
            } else if (new Date(r.markedAt) > new Date(existing.markedAt) && existing.status !== 'present') {
                recordMap.set(key, r);
            }
        });

        // Ensure all students belonging to selectedBatch are represented (defaulting to absent if not yet marked)
        if (selectedBatch) {
            allStudents.forEach(s => {
                if (selectedBatch.academicYear && Number(s.academicYear) !== Number(selectedBatch.academicYear)) return;
                if (selectedBatch.branch && (s.branch || '').toUpperCase() !== selectedBatch.branch.toUpperCase()) return;
                if (selectedBatch.section && selectedBatch.section !== 'ALL') {
                    if ((s.section || '').toUpperCase() !== selectedBatch.section.toUpperCase()) return;
                }
                if (selectedBatch.subsection && selectedBatch.subsection !== 'ALL') {
                    if ((s.subsection || '').toUpperCase() !== selectedBatch.subsection.toUpperCase()) return;
                }
                const key = s.studentId || s.id;
                if (!recordMap.has(key) && !recordMap.has(s.id) && !recordMap.has(s.studentId)) {
                    recordMap.set(key, {
                        id: `pending_${s.id}`,
                        studentId: s.id,
                        studentRollNo: s.studentId,
                        studentName: s.name,
                        status: 'absent',
                        markedAt: new Date(),
                        student: s,
                        sessionClass: selectedBatch.branch,
                        sessionSection: selectedBatch.subsection || selectedBatch.section,
                        sessionSource: 'manual'
                    });
                }
            });
        }

        const allUniqueRecords = Array.from(recordMap.values());

        // Strictly filter to the selected batch ONLY
        const strictlyBatch = allUniqueRecords.filter(r => {
            if (!selectedBatch) return true;

            const studentInfo = r.student || studentMap.get(r.studentId) || studentMap.get(r.studentRollNo);

            // 1. Branch check (MUST MATCH)
            const studentBranch = (studentInfo?.branch || r.sessionClass || '').toUpperCase();
            if (selectedBatch.branch && studentBranch !== selectedBatch.branch.toUpperCase()) {
                return false;
            }

            // 2. Academic Year check (MUST MATCH)
            const studentYear = studentInfo?.academicYear;
            if (selectedBatch.academicYear && studentYear && Number(studentYear) !== Number(selectedBatch.academicYear)) {
                return false;
            }

            // 3. Section check (MUST MATCH unless ALL)
            const studentSection = (studentInfo?.section || (r.sessionSection ? r.sessionSection.charAt(0) : '')).toUpperCase();
            if (selectedBatch.section && selectedBatch.section !== 'ALL') {
                if (studentSection && studentSection !== selectedBatch.section.toUpperCase()) {
                    return false;
                }
            }

            // 4. Subsection check (MUST MATCH unless ALL)
            const studentSubsection = (studentInfo?.subsection || r.sessionSection || '').toUpperCase();
            if (selectedBatch.subsection && selectedBatch.subsection !== 'ALL') {
                if (studentSubsection && studentSubsection !== selectedBatch.subsection.toUpperCase()) {
                    return false;
                }
            }

            return true;
        });

        const present = strictlyBatch.filter(r => r.status === 'present').length;
        const absent = strictlyBatch.filter(r => r.status === 'absent').length;

        // Apply interactive Present/Absent filter on top of the batch
        let finalDisplay = strictlyBatch;
        if (statusFilter === 'present') {
            finalDisplay = strictlyBatch.filter(r => r.status === 'present');
        } else if (statusFilter === 'absent') {
            finalDisplay = strictlyBatch.filter(r => r.status === 'absent');
        }

        return {
            batchRecords: strictlyBatch,
            filteredRecords: finalDisplay,
            presentCount: present,
            absentCount: absent
        };
    }, [sessions, allStudents, studentMap, selectedBatch, statusFilter]);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="space-y-4">
            {/* Header Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Interactive Batch Status Filters */}
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 border ${
                            statusFilter === 'all'
                                ? 'bg-zinc-700 text-white border-zinc-600 shadow-sm'
                                : 'bg-zinc-800/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                    >
                        <Users className="h-3.5 w-3.5" />
                        <span>All ({batchRecords.length})</span>
                    </button>

                    <button
                        onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 border ${
                            statusFilter === 'present'
                                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 ring-1 ring-emerald-500'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                        <span>Present: {presentCount}</span>
                    </button>

                    <button
                        onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 border ${
                            statusFilter === 'absent'
                                ? 'bg-red-500/30 text-red-200 border-red-400 ring-1 ring-red-500'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-red-400"></span>
                        <span>Absent: {absentCount}</span>
                    </button>

                    {selectedBatch && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300">
                            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                            <span>
                                {selectedBatch.branch} {formatAcademicYear(selectedBatch.academicYear)} — Sec {selectedBatch.section} ({selectedBatch.subsection})
                            </span>
                        </span>
                    )}
                </div>

                {batchRecords.length > 0 && (
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handleDownload} className="flex-1 sm:flex-none justify-center btn-secondary flex items-center gap-2 text-xs px-3 py-2">
                            <Download className="h-3.5 w-3.5" />
                            <span>Download CSV</span>
                        </button>
                        <button onClick={handleReset} className="flex-1 sm:flex-none justify-center btn-danger flex items-center gap-2 text-xs px-3 py-2">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Reset Batch</span>
                        </button>
                    </div>
                )}
            </div>

            {filteredRecords.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-zinc-950/80 border-b border-zinc-800">
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">S.No</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Student ID</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Name</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Batch / Section</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((record, index) => {
                                const studentInfo = record.student || studentMap.get(record.studentId) || studentMap.get(record.studentRollNo);
                                const branch = studentInfo?.branch || record.sessionClass || '';
                                const sub = studentInfo?.subsection || record.sessionSection || '–';

                                return (
                                    <tr key={`${record.sessionId}-${record.id || index}`} className="border-b border-zinc-800 bg-zinc-900 transition-all duration-200 hover:bg-zinc-800/80">
                                        <td className="py-3 px-4 text-xs text-zinc-400">{index + 1}</td>
                                        <td className="py-3 px-4 text-xs font-mono text-zinc-300 font-semibold">{record.studentRollNo}</td>
                                        <td className="py-3 px-4 text-sm font-semibold text-zinc-100">{record.studentName}</td>
                                        <td className="py-3 px-4 text-xs text-zinc-300">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-300 border border-zinc-700 font-mono">
                                                {branch ? `${branch}-` : ''}{sub}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                                record.status === 'present' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                            }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${record.status === 'present' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-zinc-400">
                                            <div className="flex items-center gap-1 font-mono">
                                                <Clock className="h-3 w-3 text-zinc-500" />
                                                {new Date(record.markedAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8">
                    <ClipboardList className="mx-auto mb-4 h-14 w-14 text-zinc-600" />
                    <p className="text-base font-semibold text-zinc-300">
                        {statusFilter !== 'all'
                            ? `No students marked as "${statusFilter}" today for this batch`
                            : selectedBatch
                                ? `No attendance recorded today for ${selectedBatch.branch} ${formatAcademicYear(selectedBatch.academicYear)} — Section ${selectedBatch.section} (${selectedBatch.subsection})`
                                : 'No attendance recorded for today'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                        {statusFilter !== 'all'
                            ? 'Switch back to "All" to view all records for this batch.'
                            : 'Mark attendance using Live Video, Photo Upload, or the Manual tab.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AttendanceList;