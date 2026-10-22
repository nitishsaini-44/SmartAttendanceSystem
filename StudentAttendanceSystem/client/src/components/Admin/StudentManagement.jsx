import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    UserPlus, Pencil, Archive, RotateCcw, X, Loader2, Trash2, 
    AlertTriangle, RefreshCw, Filter, Search, GraduationCap, 
    GitBranch, Layers, Grid, Check
} from 'lucide-react';

const ACADEMIC_YEARS = [
    { value: 'all', label: 'All Years' },
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
];

const FORM_ACADEMIC_YEARS = [
    { value: 1, label: '1st Year' },
    { value: 2, label: '2nd Year' },
    { value: 3, label: '3rd Year' },
    { value: 4, label: '4th Year' },
];

const BRANCH_OPTIONS = ['CSE', 'ECE', 'AIDE'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];
const SUBSECTIONS = {
    A: ['A1', 'A2', 'A3'],
    B: ['B1', 'B2', 'B3'],
    C: ['C1', 'C2', 'C3'],
    D: ['D1', 'D2', 'D3'],
};

const Field = ({ label, type = 'text', value, onChange, placeholder, required }) => (
    <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">{label}{required && ' *'}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none"
        />
    </div>
);

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
        </div>
    </div>
);

const StudentManagement = () => {
    const [students, setStudents]           = useState([]);
    const [total, setTotal]                 = useState(0);
    const [loading, setLoading]             = useState(true);
    const [search, setSearch]               = useState('');
    const [statusFilter, setStatusFilter]   = useState('active'); // 'active' | 'archived' | 'all'
    const [academicYearFilter, setAcademicYearFilter] = useState('all');
    const [branchFilter, setBranchFilter]   = useState('all');
    const [sectionFilter, setSectionFilter] = useState('all');
    const [subsectionFilter, setSubsectionFilter] = useState('all');

    const [modal, setModal]                 = useState(null); // null | 'create' | 'edit' | 'reset' | 'delete'
    const [selected, setSelected]           = useState(null);
    const [form, setForm]                   = useState({
        studentId: '',
        name: '',
        email: '',
        password: '',
        academicYear: 1,
        branch: 'CSE',
        section: 'A',
        subsection: 'A1'
    });
    const [resetPwd, setResetPwd]           = useState('');
    const [submitting, setSubmitting]       = useState(false);
    const [msg, setMsg]                     = useState('');
    const [err, setErr]                     = useState('');

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
            else if (statusFilter === 'all') params.append('status', 'all');

            if (academicYearFilter && academicYearFilter !== 'all') params.append('academicYear', academicYearFilter);
            if (branchFilter && branchFilter !== 'all') params.append('branch', branchFilter);
            if (sectionFilter && sectionFilter !== 'all') params.append('section', sectionFilter);
            if (subsectionFilter && subsectionFilter !== 'all') params.append('subsection', subsectionFilter);

            const res = await api.get(`/admin/students?${params.toString()}`);
            if (res.data.success) {
                setStudents(res.data.students);
                setTotal(res.data.count);
            }
        } catch {
            setErr('Failed to load students');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStudents();
    }, [search, statusFilter, academicYearFilter, branchFilter, sectionFilter, subsectionFilter]);

    // Handle section filter change with subsection reset
    const handleSectionFilterChange = (sec) => {
        setSectionFilter(sec);
        setSubsectionFilter('all');
    };

    const hasActiveFilters = academicYearFilter !== 'all' || branchFilter !== 'all' || sectionFilter !== 'all' || subsectionFilter !== 'all' || search !== '';

    const resetFilters = () => {
        setSearch('');
        setAcademicYearFilter('all');
        setBranchFilter('all');
        setSectionFilter('all');
        setSubsectionFilter('all');
    };


    const openEdit = (s) => {
        setSelected(s);
        const sec = s.section || 'A';
        const validSubs = SUBSECTIONS[sec] || ['A1', 'A2', 'A3'];
        const sub = validSubs.includes(s.subsection) ? s.subsection : validSubs[0];

        setForm({
            name: s.name,
            email: s.email || '',
            academicYear: s.academicYear || 1,
            branch: s.branch || 'CSE',
            section: sec,
            subsection: sub
        });
        setModal('edit');
        setErr('');
        setMsg('');
    };

    const openReset = (s) => {
        setSelected(s);
        setResetPwd('');
        setModal('reset');
        setErr('');
        setMsg('');
    };

    const openDelete = (s) => {
        setSelected(s);
        setModal('delete');
        setErr('');
        setMsg('');
    };

    const close = () => {
        setModal(null);
        setSelected(null);
    };

    const setF = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

    const handleFormSectionChange = (newSec) => {
        const validSubs = SUBSECTIONS[newSec] || [];
        setForm(f => ({
            ...f,
            section: newSec,
            subsection: validSubs[0] || `${newSec}1`
        }));
    };


    const handleEdit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErr('');
        try {
            const studentId = selected.id || selected._id;
            const res = await api.put(`/admin/students/${studentId}`, {
                ...form,
                academicYear: parseInt(form.academicYear, 10)
            });
            if (res.data.success) {
                setMsg('Student updated successfully!');
                fetchStudents();
                setTimeout(close, 1200);
            } else {
                setErr(res.data.message);
            }
        } catch (ex) {
            setErr(ex.response?.data?.message || 'Error updating student');
        }
        setSubmitting(false);
    };

    const handleArchiveToggle = async (s) => {
        const isArchived = s.status === 'archived';
        const actionLabel = isArchived ? 'restore' : 'archive';
        if (!window.confirm(`${isArchived ? 'Restore' : 'Archive'} student ${s.name}?`)) return;
        try {
            const studentId = s.id || s._id;
            const res = await api.put(`/admin/students/${studentId}/archive`);
            if (res.data.success) {
                fetchStudents();
            }
        } catch (ex) {
            setErr(ex.response?.data?.message || `Failed to ${actionLabel} student`);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        setSubmitting(true);
        setErr('');
        try {
            const studentId = selected.id || selected._id;
            const res = await api.delete(`/admin/students/${studentId}`);
            if (res.data.success) {
                setMsg('Student permanently deleted!');
                fetchStudents();
                setTimeout(close, 1200);
            } else {
                setErr(res.data.message);
            }
        } catch (ex) {
            setErr(ex.response?.data?.message || 'Error deleting student');
        }
        setSubmitting(false);
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErr('');
        try {
            const studentId = selected.id || selected._id;
            const res = await api.put(`/admin/students/${studentId}/reset-password`, { newPassword: resetPwd });
            if (res.data.success) {
                setMsg('Password reset successfully!');
                setTimeout(close, 1200);
            } else {
                setErr(res.data.message);
            }
        } catch (ex) {
            setErr(ex.response?.data?.message || 'Error resetting password');
        }
        setSubmitting(false);
    };

    const formatAcademicYear = (yr) => {
        if (!yr) return '–';
        const num = parseInt(yr, 10);
        if (num === 1) return '1st Year';
        if (num === 2) return '2nd Year';
        if (num === 3) return '3rd Year';
        if (num === 4) return '4th Year';
        return `${num} Year`;
    };

    // Calculate available subsections for filter
    const availableSubsections = sectionFilter !== 'all' ? (SUBSECTIONS[sectionFilter] || []) : [];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Students Management</h1>
                    <p className="text-sm text-zinc-400">
                        {total} {statusFilter === 'all' ? 'total' : statusFilter} student(s) enrolled
                    </p>
                </div>
                <Link
                    to="/admin/students/add"
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 transition-colors shadow-sm"
                >
                    <UserPlus className="h-4 w-4" /> Register Student
                </Link>
            </div>

            {/* Combined Academic & Search Filter Bar */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <Filter className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Filter &amp; Search Students</span>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-medium"
                        >
                            <X className="h-3 w-3" /> Clear Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    {/* Search */}
                    <div className="lg:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, Roll No, or email…"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-white focus:outline-none"
                        />
                    </div>

                    {/* Academic Year Filter */}
                    <div>
                        <select
                            value={academicYearFilter}
                            onChange={e => setAcademicYearFilter(e.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                        >
                            {ACADEMIC_YEARS.map(y => (
                                <option key={y.value} value={y.value}>{y.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Branch Filter */}
                    <div>
                        <select
                            value={branchFilter}
                            onChange={e => setBranchFilter(e.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                        >
                            <option value="all">All Branches</option>
                            {BRANCH_OPTIONS.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    {/* Section Filter */}
                    <div>
                        <select
                            value={sectionFilter}
                            onChange={e => handleSectionFilterChange(e.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                        >
                            <option value="all">All Sections</option>
                            {SECTION_OPTIONS.map(s => (
                                <option key={s} value={s}>Section {s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subsection Filter (Dependent) */}
                    <div>
                        <select
                            value={subsectionFilter}
                            onChange={e => setSubsectionFilter(e.target.value)}
                            disabled={sectionFilter === 'all'}
                            className={`w-full rounded-xl border px-3 py-2 text-xs text-white focus:border-white focus:outline-none ${
                                sectionFilter === 'all'
                                    ? 'border-zinc-800 bg-zinc-800/40 text-zinc-500 cursor-not-allowed'
                                    : 'border-zinc-700 bg-zinc-800/80'
                            }`}
                        >
                            <option value="all">
                                {sectionFilter === 'all' ? 'All Subsections' : `All Sec ${sectionFilter} Subsections`}
                            </option>
                            {availableSubsections.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Status Tabs Bar */}
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-800/50 p-1">
                        {['active', 'archived', 'all'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                                    statusFilter === status
                                        ? 'bg-zinc-700 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Filter summary tags */}
                    <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
                        {academicYearFilter !== 'all' && (
                            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-400 border border-blue-500/20">
                                {formatAcademicYear(academicYearFilter)}
                            </span>
                        )}
                        {branchFilter !== 'all' && (
                            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-purple-400 border border-purple-500/20">
                                {branchFilter}
                            </span>
                        )}
                        {sectionFilter !== 'all' && (
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-400 border border-emerald-500/20">
                                Sec {sectionFilter}
                            </span>
                        )}
                        {subsectionFilter !== 'all' && (
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-400 border border-amber-500/20">
                                Sub {subsectionFilter}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {err && !modal && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                    {err}
                </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b border-zinc-800 bg-zinc-950">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Roll Number</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Academic Year</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Branch</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Section</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Subsection</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr><td colSpan={8} className="py-8 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-zinc-400">No students match your criteria</p>
                                            <p className="text-xs text-zinc-500">Try adjusting your academic filters or search keyword</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : students.map(s => {
                                const studentKey = s.id || s._id;
                                const isArchived = s.status === 'archived';
                                return (
                                    <tr key={studentKey} className="hover:bg-zinc-800/40 transition-colors">
                                        {/* Name & Email */}
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{s.name}</div>
                                            {s.email && <div className="text-xs text-zinc-400">{s.email}</div>}
                                        </td>

                                        {/* Roll Number / Student ID */}
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-300">
                                            {s.studentId}
                                        </td>

                                        {/* Academic Year */}
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                                                {formatAcademicYear(s.academicYear)}
                                            </span>
                                        </td>

                                        {/* Branch */}
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/20">
                                                {s.branch || 'CSE'}
                                            </span>
                                        </td>

                                        {/* Section */}
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-zinc-800 text-xs font-bold text-zinc-200 border border-zinc-700">
                                                {s.section || 'A'}
                                            </span>
                                        </td>

                                        {/* Subsection */}
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-bold text-amber-400 border border-amber-500/20">
                                                {s.subsection || '–'}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                s.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                                            }`}>{s.status}</span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEdit(s)}
                                                    title="Edit Student"
                                                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => openReset(s)}
                                                    title="Reset Password"
                                                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-amber-400 transition-colors"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleArchiveToggle(s)}
                                                    title={isArchived ? "Restore Student" : "Archive Student"}
                                                    className={`rounded-lg p-1.5 transition-colors ${
                                                        isArchived 
                                                            ? 'text-emerald-400 hover:bg-emerald-500/20' 
                                                            : 'text-zinc-400 hover:bg-zinc-700 hover:text-amber-400'
                                                    }`}
                                                >
                                                    {isArchived ? <RefreshCw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    onClick={() => openDelete(s)}
                                                    title="Delete Student"
                                                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Edit Modal */}
            {modal === 'edit' && (
                <Modal title={`Edit Student — ${selected?.studentId}`} onClose={close}>
                    <form onSubmit={handleEdit} className="space-y-3">
                        <Field label="Full Name" value={form.name} onChange={setF('name')} required />
                        <Field label="Email" value={form.email} onChange={setF('email')} type="email" placeholder="student@school.edu" />

                        {/* Academic Structure Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-400">Academic Year *</label>
                                <select
                                    value={form.academicYear}
                                    onChange={e => setF('academicYear')(parseInt(e.target.value, 10))}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {FORM_ACADEMIC_YEARS.map(y => (
                                        <option key={y.value} value={y.value}>{y.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-400">Branch *</label>
                                <select
                                    value={form.branch}
                                    onChange={e => setF('branch')(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {BRANCH_OPTIONS.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-400">Section *</label>
                                <select
                                    value={form.section}
                                    onChange={e => handleFormSectionChange(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {SECTION_OPTIONS.map(s => (
                                        <option key={s} value={s}>Section {s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-400">Subsection *</label>
                                <select
                                    value={form.subsection}
                                    onChange={e => setF('subsection')(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {(SUBSECTIONS[form.section] || []).map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50 transition-colors"
                            >
                                {submitting ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {modal === 'reset' && (
                <Modal title={`Reset Password — ${selected?.name}`} onClose={close}>
                    <form onSubmit={handleReset} className="space-y-3">
                        <Field label="New Password" type="password" value={resetPwd} onChange={setResetPwd} required placeholder="Min 6 characters" />
                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
                        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                            {submitting ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {modal === 'delete' && (
                <Modal title="Delete Student" onClose={close}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-white">Permanently Delete Student?</p>
                                <p className="text-xs text-red-300 mt-1">
                                    This action cannot be undone. It will permanently remove:
                                </p>
                                <ul className="list-disc list-inside text-xs text-red-300 mt-1 space-y-0.5">
                                    <li>Student profile &amp; login account</li>
                                    <li>Facial recognition embedding data</li>
                                    <li>Course enrollments &amp; attendance records</li>
                                </ul>
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3 text-sm">
                            <p className="font-medium text-white">{selected?.name}</p>
                            <p className="text-xs text-zinc-400 font-mono">Roll No: {selected?.studentId}</p>
                            {selected?.email && <p className="text-xs text-zinc-400 mt-0.5">Email: {selected.email}</p>}
                            <div className="flex items-center gap-2 mt-2">
                                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 border border-blue-500/20">
                                    {formatAcademicYear(selected?.academicYear)}
                                </span>
                                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300 border border-purple-500/20">
                                    {selected?.branch || 'CSE'}
                                </span>
                                <span className="rounded-md bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200">
                                    Sec: {selected?.section || '–'} ({selected?.subsection || '–'})
                                </span>
                            </div>
                        </div>

                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={close}
                                disabled={submitting}
                                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" /> Delete Student
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default StudentManagement;

