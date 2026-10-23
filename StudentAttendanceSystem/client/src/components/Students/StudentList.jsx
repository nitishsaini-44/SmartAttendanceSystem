import React, { useEffect, useState, useMemo } from 'react';
import studentService from '../../services/studentService';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
    Search, Download, Users, Info, X, User, Mail, 
    GraduationCap, GitBranch, Layers, Grid, BookOpen, Scan, Camera,
    ShieldCheck, ShieldAlert, Lock, Unlock, ArrowLeft, CheckCircle2,
    SlidersHorizontal, Eye
} from 'lucide-react';
import { SkeletonTableRows } from '../common/Skeleton';
import toast from 'react-hot-toast';
import Card from '../common/Card';

const formatAcademicYear = (yr) => {
    if (!yr) return '–';
    const num = parseInt(yr, 10);
    if (num === 1) return '1st Year';
    if (num === 2) return '2nd Year';
    if (num === 3) return '3rd Year';
    if (num === 4) return '4th Year';
    return `${num}th Year`;
};

const BRANCH_NAMES = {
    CSE: 'Computer Science & Engineering',
    ECE: 'Electronics & Communication Engineering',
    ME:  'Mechanical Engineering',
    CE:  'Civil Engineering',
    EE:  'Electrical Engineering',
    IT:  'Information Technology'
};

const SECTIONS = ['A', 'B', 'C', 'D'];
const SUB_INDICES = ['1', '2', '3'];

const StudentList = () => {
    const { user }                                = useAuth();
    const [students, setStudents]                 = useState([]);
    const [loading, setLoading]                   = useState(true);
    const [searchTerm, setSearchTerm]             = useState('');
    const [selectedStudent, setSelectedStudent]   = useState(null);
    const [teacherAccess, setTeacherAccess]       = useState([]);
    const [accessLoading, setAccessLoading]       = useState(false);
    const [activeBatch, setActiveBatch]           = useState(null); // { branch, academicYear, section, subsection }

    useEffect(() => {
        fetchStudents();
        if (user?.role === 'teacher') {
            fetchTeacherAccess();
        }
    }, [user]);

    const fetchTeacherAccess = async () => {
        setAccessLoading(true);
        try {
            const res = await api.get('/teacher/my-access');
            if (res.data.success) {
                setTeacherAccess(res.data.access || []);
            }
        } catch (e) {
            console.error('Failed to load teacher academic access:', e);
        } finally {
            setAccessLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await studentService.getAllStudents();
            setStudents(response.students || []);
        } catch (error) {
            toast.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    // Extract unique department & year blocks based on role / access
    const academicBlocks = useMemo(() => {
        if (user?.role === 'teacher') {
            const blockMap = new Map();
            teacherAccess.forEach(a => {
                const key = `${a.branch.toUpperCase()}-${a.academicYear}`;
                if (!blockMap.has(key)) {
                    blockMap.set(key, {
                        branch: a.branch.toUpperCase(),
                        academicYear: a.academicYear,
                        title: `${BRANCH_NAMES[a.branch.toUpperCase()] || a.branch} — ${formatAcademicYear(a.academicYear)}`,
                        shortTitle: `${a.branch} (${formatAcademicYear(a.academicYear)})`
                    });
                }
            });
            return Array.from(blockMap.values());
        }

        // For Admin: extract unique branch + year from students or default blocks
        const blockMap = new Map();
        students.forEach(s => {
            const b = (s.branch || 'CSE').toUpperCase();
            const y = s.academicYear || 1;
            const key = `${b}-${y}`;
            if (!blockMap.has(key)) {
                blockMap.set(key, {
                    branch: b,
                    academicYear: y,
                    title: `${BRANCH_NAMES[b] || b} — ${formatAcademicYear(y)}`,
                    shortTitle: `${b} (${formatAcademicYear(y)})`
                });
            }
        });

        if (blockMap.size === 0) {
            return [
                { branch: 'CSE', academicYear: 4, title: 'Computer Science & Engineering — 4th Year', shortTitle: 'CSE (4th Year)' },
                { branch: 'ECE', academicYear: 3, title: 'Electronics & Communication Engineering — 3rd Year', shortTitle: 'ECE (3rd Year)' }
            ];
        }

        return Array.from(blockMap.values());
    }, [teacherAccess, students, user]);

    // Check if teacher has access to a specific batch chip
    const checkBatchAccess = (block, section, subsection) => {
        if (user?.role === 'admin') return true;
        if (!teacherAccess || !teacherAccess.length) return false;

        return teacherAccess.some(a => {
            // 1. Academic Year must match
            if (Number(a.academicYear) !== Number(block.academicYear)) return false;

            // 2. Branch must match
            if ((a.branch || '').toUpperCase() !== (block.branch || '').toUpperCase()) return false;

            // 3. Section check: MUST match the requested section (or a.section is 'ALL')
            const aSec = (a.section || '').toUpperCase();
            const targetSec = (section || '').toUpperCase();
            if (aSec !== 'ALL' && aSec !== targetSec) return false;

            // 4. Subsection check: MUST match the requested subsection (or a.subsection is 'ALL' for that section)
            const aSub = (a.subsection || '').toUpperCase();
            const targetSub = (subsection || '').toUpperCase();
            if (aSub !== 'ALL' && aSub !== targetSub) return false;

            return true;
        });
    };

    // Filter students for active batch & search query
    const activeBatchStudents = useMemo(() => {
        if (!activeBatch) return [];

        return students.filter(student => {
            const matchYear = Number(student.academicYear) === Number(activeBatch.academicYear);
            const matchBranch = (student.branch || '').toUpperCase() === (activeBatch.branch || '').toUpperCase();
            const matchSection = (student.section || '').toUpperCase() === (activeBatch.section || '').toUpperCase();
            const matchSub = activeBatch.subsection === 'ALL'
                ? matchSection
                : (student.subsection || '').toUpperCase() === (activeBatch.subsection || '').toUpperCase();

            if (!matchYear || !matchBranch || !matchSection || !matchSub) return false;

            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                (student.name || '').toLowerCase().includes(term) ||
                (student.studentId || '').toLowerCase().includes(term) ||
                (student.email || '').toLowerCase().includes(term)
            );
        });
    }, [students, activeBatch, searchTerm]);

    const handleBatchClick = (block, section, subsection) => {
        const hasAccess = checkBatchAccess(block, section, subsection);
        if (!hasAccess) {
            toast.error(`🔒 Batch ${subsection} is locked. You do not have access permission from Administration.`);
            return;
        }

        setActiveBatch({
            branch: block.branch,
            academicYear: block.academicYear,
            section,
            subsection
        });
        setSearchTerm('');
    };

    const handleDownloadCSV = async () => {
        try {
            const blob = await studentService.downloadStudentsCSV();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = activeBatch 
                ? `students_${activeBatch.branch}_Y${activeBatch.academicYear}_${activeBatch.subsection}.csv`
                : 'students_list.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('CSV downloaded successfully');
        } catch (error) {
            toast.error('Failed to download CSV');
        }
    };

    const getProfileUrl = (student) =>
        student.profilePhoto
            ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${student.profilePhoto}`
            : null;

    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-title">Students Directory</h1>
                    <p className="text-subtext">
                        {activeBatch 
                            ? `Showing students enrolled in Batch ${activeBatch.subsection}` 
                            : 'Department and academic batch overview'}
                    </p>
                </div>
                <div className="flex gap-2 sm:gap-3">
                    <button onClick={handleDownloadCSV} className="btn-secondary flex items-center gap-2 text-sm">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span> CSV
                    </button>
                </div>
            </div>

            {/* Scope Notice Banner */}
            {user?.role === 'teacher' && !activeBatch && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs sm:text-sm text-blue-200/90 leading-relaxed">
                            <span className="font-semibold text-white">Administration-Allocated Student Groups:</span> Batches 
                            assigned to you by college administration are <span className="font-semibold text-emerald-400">UNLOCKED</span>. 
                            Batches not allocated to you are <span className="font-semibold text-zinc-400">LOCKED 🔒</span>. Click any unlocked batch to inspect its students.
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* VIEW A: ACTIVE BATCH STUDENT ROSTER */}
            {/* ============================================================== */}
            {activeBatch ? (
                <div className="space-y-4">
                    {/* Active Batch Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 backdrop-blur">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setActiveBatch(null)}
                                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                All Batches
                            </button>
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>{activeBatch.branch} — {formatAcademicYear(activeBatch.academicYear)}</span>
                                    <span className="rounded-lg bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-xs font-mono text-blue-300">
                                        {activeBatch.subsection === 'ALL' ? `Section ${activeBatch.section} (All Subsections)` : `Batch ${activeBatch.subsection}`}
                                    </span>
                                </h2>
                                <p className="text-xs text-zinc-400">
                                    Section {activeBatch.section} • {activeBatchStudents.length} student(s) enrolled
                                </p>
                            </div>
                        </div>

                        {/* Search Input for Active Batch with ample padding */}
                        <div className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search by name, roll no, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-11 text-xs"
                            />
                        </div>
                    </div>

                    <Card className="p-4 sm:p-6">
                        {loading ? (
                            <SkeletonTableRows rows={6} />
                        ) : activeBatchStudents.length > 0 ? (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto rounded-2xl border border-zinc-800">
                                    <table className="w-full min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-zinc-800 bg-zinc-900/70">
                                                {['Avatar', 'Name & Roll No', 'Email', 'Batch', 'Face Registration', 'Actions'].map(col => (
                                                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeBatchStudents.map((student, index) => {
                                                const studentKey = student.id || student._id;
                                                const profileUrl = getProfileUrl(student);
                                                const hasFace = student.faceEmbedding && student.faceEmbedding.length > 0;
                                                return (
                                                    <tr 
                                                        key={studentKey} 
                                                        className={`${index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950/40'} border-b border-zinc-800 transition-all duration-200 hover:bg-zinc-800/70`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="h-10 w-10 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
                                                                {profileUrl ? (
                                                                    <img src={profileUrl} alt={student.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-300">
                                                                        {student.name?.charAt(0) || 'S'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                                                            <div>{student.name}</div>
                                                            <div className="text-xs font-mono text-zinc-400">{student.studentId}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-zinc-300">{student.email || '—'}</td>
                                                        <td className="px-4 py-3 text-sm text-zinc-300">
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 px-2.5 py-1 text-xs text-zinc-200 border border-zinc-700">
                                                                <span className="font-semibold text-white">Y{student.academicYear || 1}</span>
                                                                <span className="text-zinc-500">•</span>
                                                                <span>{student.branch || 'CSE'}</span>
                                                                <span className="text-zinc-500">-</span>
                                                                <span className="font-mono text-blue-300 font-semibold">{student.subsection || 'A1'}</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {hasFace ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                                                    <Scan className="h-3 w-3" /> Registered
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                                                                    <Camera className="h-3 w-3" /> Pending
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => setSelectedStudent(student)}
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors shadow-sm"
                                                            >
                                                                <Info className="h-3.5 w-3.5 text-blue-400" />
                                                                Show Info
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-3">
                                    {activeBatchStudents.map((student) => {
                                        const studentKey = student.id || student._id;
                                        const profileUrl = getProfileUrl(student);
                                        return (
                                            <div key={studentKey} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
                                                            {profileUrl ? (
                                                                <img src={profileUrl} alt={student.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-300">
                                                                    {student.name?.charAt(0) || 'S'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-zinc-100 truncate">{student.name}</p>
                                                            <p className="text-xs text-zinc-400 font-mono truncate">{student.studentId}</p>
                                                            <div className="mt-1">
                                                                <span className="inline-block rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                                                                    Batch {student.subsection || 'A1'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedStudent(student)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors flex-shrink-0"
                                                    >
                                                        <Info className="h-3.5 w-3.5 text-blue-400" />
                                                        Info
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center">
                                <Users className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
                                <p className="text-base font-semibold text-zinc-300">No students found in Batch {activeBatch.subsection}</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    {searchTerm ? 'Try adjusting your search query.' : 'No students have been enrolled in this batch yet.'}
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            ) : (
                /* ============================================================== */
                /* VIEW B: GROUP-WISE DEPARTMENT & CLASS BLOCKS                   */
                /* ============================================================== */
                <div className="space-y-6">
                    {accessLoading ? (
                        <div className="py-12 text-center text-zinc-400">Loading academic blocks...</div>
                    ) : academicBlocks.length > 0 ? (
                        academicBlocks.map((block) => {
                            // Count how many accessible batches exist in this block
                            const totalAccessibleInBlock = SECTIONS.reduce((acc, sec) => {
                                return acc + SUB_INDICES.filter(subIdx => checkBatchAccess(block, sec, `${sec}${subIdx}`)).length;
                            }, 0);

                            return (
                                <Card key={`${block.branch}-${block.academicYear}`} className="overflow-hidden border-zinc-800 bg-zinc-900/90 p-5 sm:p-6 backdrop-blur">
                                    {/* Block Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4 mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                                <GraduationCap className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-white tracking-tight">
                                                    {block.title}
                                                </h2>
                                                <p className="text-xs text-zinc-400">
                                                    Department of {BRANCH_NAMES[block.branch] || block.branch} • All Subsections
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                                                <Unlock className="h-3 w-3 text-emerald-400" />
                                                {totalAccessibleInBlock} / {SECTIONS.length * SUB_INDICES.length} Batches Unlocked
                                            </span>
                                        </div>
                                    </div>

                                    {/* Subsections Grid: Sections A, B, C, D (3 Subsections Each: 1, 2, 3) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {SECTIONS.map((sec) => (
                                            <div key={sec} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-2.5">
                                                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                                        <Layers className="h-3.5 w-3.5 text-blue-400" />
                                                        Section {sec}
                                                    </span>
                                                    {checkBatchAccess(block, sec, 'ALL') ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleBatchClick(block, sec, 'ALL')}
                                                            className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-300 transition-colors shadow-sm cursor-pointer"
                                                            title={`View all students in Section ${sec}`}
                                                        >
                                                            <Unlock className="h-2.5 w-2.5 text-emerald-400" />
                                                            All Section {sec}
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                                                            <Lock className="h-3 w-3 text-zinc-500" />
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    {SUB_INDICES.map((subIdx) => {
                                                        const subsectionName = `${sec}${subIdx}`;
                                                        const isUnlocked = checkBatchAccess(block, sec, subsectionName);
                                                        const batchStudentsCount = students.filter(s =>
                                                            Number(s.academicYear) === Number(block.academicYear) &&
                                                            (s.branch || '').toUpperCase() === block.branch.toUpperCase() &&
                                                            (s.section || '').toUpperCase() === sec.toUpperCase() &&
                                                            (s.subsection || '').toUpperCase() === subsectionName.toUpperCase()
                                                        ).length;

                                                        return (
                                                            <button
                                                                key={subsectionName}
                                                                onClick={() => handleBatchClick(block, sec, subsectionName)}
                                                                className={`group relative flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-200 border ${
                                                                    isUnlocked
                                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/60 hover:bg-emerald-500/20 shadow-sm cursor-pointer'
                                                                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-600 opacity-50 cursor-not-allowed hover:bg-zinc-900/60'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between w-full mb-1">
                                                                    <span className="text-xs font-mono font-bold text-white">
                                                                        {subsectionName}
                                                                    </span>
                                                                    {isUnlocked ? (
                                                                        <Unlock className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                                                    ) : (
                                                                        <Lock className="h-3.5 w-3.5 text-zinc-500" />
                                                                    )}
                                                                </div>

                                                                <span className="text-[10px] font-medium text-zinc-400">
                                                                    {isUnlocked 
                                                                        ? `${batchStudentsCount} Student${batchStudentsCount === 1 ? '' : 's'}` 
                                                                        : 'Locked'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
                            <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-amber-400" />
                            <h3 className="text-base font-bold text-white">No Student Batches Assigned</h3>
                            <p className="mt-1 text-xs text-amber-300/80 max-w-md mx-auto">
                                The college administration has not assigned you access to any department batches yet. Please contact the administrator to allocate classes to your account.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== STUDENT INFO MODAL (Properly centered & constrained to viewport) ===== */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto py-6 sm:py-8">
                    <div className="relative w-full max-w-lg my-auto max-h-[85vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header (fixed at top of modal) */}
                        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 bg-zinc-950/80 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-400" />
                                <h3 className="font-semibold text-white">Student Information</h3>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body (scrollable within modal) */}
                        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Profile Card */}
                            <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800">
                                    {getProfileUrl(selectedStudent) ? (
                                        <img
                                            src={getProfileUrl(selectedStudent)}
                                            alt={selectedStudent.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-zinc-300">
                                            {selectedStudent.name?.charAt(0) || 'S'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-white truncate">{selectedStudent.name}</h4>
                                    <p className="text-xs font-mono text-zinc-400">Roll No: {selectedStudent.studentId}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            selectedStudent.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-zinc-700 text-zinc-300'
                                        }`}>
                                            {selectedStudent.status === 'active' ? 'Active' : selectedStudent.status}
                                        </span>

                                        {selectedStudent.faceEmbedding && selectedStudent.faceEmbedding.length > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                                <Scan className="h-3 w-3" /> Face Registered
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                                                <Camera className="h-3 w-3" /> Face Not Registered
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Academic Year */}
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
                                        <GraduationCap className="h-4 w-4 text-blue-400" />
                                        <span>Academic Year</span>
                                    </div>
                                    <p className="text-sm font-semibold text-white">
                                        {formatAcademicYear(selectedStudent.academicYear)}
                                    </p>
                                </div>

                                {/* Branch */}
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
                                        <GitBranch className="h-4 w-4 text-purple-400" />
                                        <span>Branch</span>
                                    </div>
                                    <p className="text-sm font-semibold text-white">
                                        {selectedStudent.branch || 'CSE'}
                                    </p>
                                </div>

                                {/* Section */}
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
                                        <Layers className="h-4 w-4 text-emerald-400" />
                                        <span>Section</span>
                                    </div>
                                    <p className="text-sm font-semibold text-white">
                                        Section {selectedStudent.section || 'A'}
                                    </p>
                                </div>

                                {/* Subsection */}
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
                                        <Grid className="h-4 w-4 text-amber-400" />
                                        <span>Subsection</span>
                                    </div>
                                    <p className="text-sm font-semibold text-white font-mono">
                                        {selectedStudent.subsection || '–'}
                                    </p>
                                </div>

                                {/* Email */}
                                <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
                                        <Mail className="h-4 w-4 text-zinc-400" />
                                        <span>Email Address</span>
                                    </div>
                                    <p className="text-sm font-semibold text-white break-all">
                                        {selectedStudent.email || 'Not provided'}
                                    </p>
                                </div>

                                {/* Assigned Class / Batch */}
                                {selectedStudent.class && (
                                    <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
                                            <BookOpen className="h-4 w-4 text-zinc-400" />
                                            <span>Class / Batch</span>
                                        </div>
                                        <p className="text-sm font-semibold text-white">
                                            {selectedStudent.class}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer (fixed at bottom of modal) */}
                        <div className="border-t border-zinc-800 px-5 py-3.5 bg-zinc-950/80 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentList;