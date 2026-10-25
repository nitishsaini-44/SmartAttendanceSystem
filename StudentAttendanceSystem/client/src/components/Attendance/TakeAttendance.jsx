import React, { useState, useEffect } from 'react';
import studentService from '../../services/studentService';
import attendanceService, { isSessionMatchingBatch } from '../../services/attendanceService';
import { Check, X, Users, Save } from 'lucide-react';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const TakeAttendance = ({ onAttendanceMarked, selectedBatch }) => {
    const [allStudents, setAllStudents] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchStudentsAndTodayAttendance();
    }, [selectedBatch]);

    const fetchStudentsAndTodayAttendance = async () => {
        setLoading(true);
        try {
            const params = selectedBatch ? {
                branch: selectedBatch.branch,
                section: selectedBatch.section,
                subsection: selectedBatch.subsection,
                academicYear: selectedBatch.academicYear
            } : {};
            // Fetch students and today's attendance in parallel
            const [studentsResponse, todayAttendanceResponse] = await Promise.all([
                studentService.getAllStudents(),
                attendanceService.getTodayAttendance(params).catch(() => ({ sessions: [], attendance: [] }))
            ]);

            const studentList = studentsResponse.students || [];
            setAllStudents(studentList);

            // Aggregate attendance records across sessions matching THIS specific batch ONLY
            const sessions = todayAttendanceResponse.sessions || todayAttendanceResponse.attendance || [];
            const matchingSessions = selectedBatch 
                ? sessions.filter(session => isSessionMatchingBatch(session, selectedBatch))
                : sessions;

            const attendanceMap = {};
            matchingSessions.forEach(session => {
                (session.records || []).forEach(record => {
                    const studentId = record.studentId?._id || record.studentId;
                    if (studentId) {
                        // If marked present in any matching session today, preserve 'present'
                        if (record.status === 'present' || !attendanceMap[studentId]) {
                            attendanceMap[studentId] = record.status;
                        }
                    }
                });
            });

            // Filter students for the active batch
            let filtered = studentList;
            if (selectedBatch) {
                filtered = studentList.filter(s => {
                    const matchYear = !selectedBatch.academicYear || Number(s.academicYear) === Number(selectedBatch.academicYear);
                    const matchBranch = !selectedBatch.branch || s.branch?.toUpperCase() === selectedBatch.branch?.toUpperCase();
                    const matchSection = !selectedBatch.section || s.section?.toUpperCase() === selectedBatch.section?.toUpperCase();
                    const matchSub = !selectedBatch.subsection || selectedBatch.subsection === 'ALL' || s.subsection?.toUpperCase() === selectedBatch.subsection?.toUpperCase();
                    return matchYear && matchBranch && matchSection && matchSub;
                });
            }
            setStudents(filtered);

            // Pre-fill attendance with today's real database status (e.g. recognized by face)
            const initialAttendance = {};
            filtered.forEach(student => {
                const sid = student.id || student._id;
                initialAttendance[sid] = attendanceMap[sid] || 'absent';
            });
            setAttendance(initialAttendance);
        } catch (error) {
            toast.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = (studentId) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
        }));
    };

    const markAllPresent = () => {
        const allPresent = {};
        students.forEach(student => {
            const sid = student.id || student._id;
            allPresent[sid] = 'present';
        });
        setAttendance(allPresent);
    };

    const markAllAbsent = () => {
        const allAbsent = {};
        students.forEach(student => {
            const sid = student.id || student._id;
            allAbsent[sid] = 'absent';
        });
        setAttendance(allAbsent);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const records = students.map((student) => {
                const sid = student.id || student._id;
                return {
                    studentId: sid,
                    status: attendance[sid] || 'absent'
                };
            });

            const payload = {
                records,
                class: selectedBatch?.branch || '',
                branch: selectedBatch?.branch || '',
                section: selectedBatch?.section || '',
                subsection: selectedBatch?.subsection || '',
                academicYear: selectedBatch?.academicYear
            };

            await attendanceService.takeAttendance(payload);
            toast.success(`Attendance recorded for ${records.length} student(s)!`);
            if (onAttendanceMarked) onAttendanceMarked();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to mark attendance');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Loader />;
    }

    if (students.length === 0) {
        return (
            <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-16 w-16 text-zinc-600" />
                <p className="text-lg text-zinc-300">No students found in this batch</p>
                <p className="mt-2 text-sm text-zinc-500">
                    {selectedBatch
                        ? `No active students are currently registered in ${selectedBatch.branch} Year ${selectedBatch.academicYear} ${selectedBatch.subsection}.`
                        : "Please select an assigned batch above."}
                </p>
            </div>
        );
    }

    const presentCount = Object.values(attendance).filter(s => s === 'present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'absent').length;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <p className="text-sm text-zinc-400">
                        <span className="font-semibold text-emerald-300">{presentCount} Present</span>
                        {' | '}
                        <span className="font-semibold text-red-300">{absentCount} Absent</span>
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button type="button" onClick={markAllPresent} className="flex-1 sm:flex-none justify-center flex items-center rounded-xl bg-emerald-500/20 px-3 py-2 sm:py-1.5 text-sm font-medium text-emerald-300 transition-all duration-200 hover:bg-emerald-500/30">
                        Mark All Present
                    </button>
                    <button type="button" onClick={markAllAbsent} className="flex-1 sm:flex-none justify-center flex items-center rounded-xl bg-red-500/20 px-3 py-2 sm:py-1.5 text-sm font-medium text-red-300 transition-all duration-200 hover:bg-red-500/30">
                        Mark All Absent
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {students.map((student) => {
                        const studentKey = student.id || student._id;
                        const isPresent = attendance[studentKey] === 'present';
                        return (
                            <div
                                key={studentKey}
                                onClick={() => toggleAttendance(studentKey)}
                                className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                                    isPresent
                                        ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                                        : 'border-red-500/40 bg-red-500/10 hover:bg-red-500/20'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                                            isPresent
                                                ? 'bg-emerald-500/20 border-emerald-500/30'
                                                : 'bg-red-500/20 border-red-500/30'
                                        }`}
                                    >
                                        <span
                                            className={`font-semibold ${
                                                isPresent ? 'text-emerald-300' : 'text-red-300'
                                            }`}
                                        >
                                            {student.name?.charAt(0) || 'S'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-100">{student.name}</p>
                                        <p className="text-sm font-mono text-zinc-400">ID: {student.studentId}</p>
                                    </div>
                                </div>
                                <div
                                    className={`rounded-xl p-2 ${
                                        isPresent ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                    }`}
                                >
                                    {isPresent ? (
                                        <Check className="h-5 w-5" />
                                    ) : (
                                        <X className="h-5 w-5" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button type="submit" disabled={submitting} className="w-full btn-success mt-6 py-3 flex items-center justify-center gap-2">
                    {submitting ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            Save Attendance
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default TakeAttendance;