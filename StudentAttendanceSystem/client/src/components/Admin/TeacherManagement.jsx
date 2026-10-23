import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { 
    UserPlus, Pencil, Archive, RotateCcw, X, Check, Loader2, 
    Trash2, AlertTriangle, RefreshCw, GraduationCap, Plus, BookOpen, Layers
} from 'lucide-react';

const VALID_ACADEMIC_YEARS = [
    { value: 1, label: '1st Year' },
    { value: 2, label: '2nd Year' },
    { value: 3, label: '3rd Year' },
    { value: 4, label: '4th Year' }
];

const VALID_BRANCHES = [
    { value: 'CSE', label: 'CSE (Computer Science & Engineering)' },
    { value: 'ECE', label: 'ECE (Electronics & Communication Engineering)' },
    { value: 'AIDE', label: 'AIDE (Artificial Intelligence & Data Engineering)' }
];

const VALID_SECTIONS = ['A', 'B', 'C', 'D'];

const VALID_SUBSECTIONS = {
    A: ['A1', 'A2', 'A3'],
    B: ['B1', 'B2', 'B3'],
    C: ['C1', 'C2', 'C3'],
    D: ['D1', 'D2', 'D3'],
};

// ── Shared field component ────────────────────────────────────────────────────
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

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, maxWidth = 'max-w-md', children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className={`w-full ${maxWidth} rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">{children}</div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const TeacherManagement = () => {
    const [teachers, setTeachers]       = useState([]);
    const [total, setTotal]             = useState(0);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'archived' | 'all'
    const [modal, setModal]             = useState(null); // null | 'create' | 'edit' | 'reset' | 'delete' | 'access'
    const [selected, setSelected]       = useState(null);
    const [form, setForm]               = useState({ name: '', email: '', password: '', subject: '' });
    const [resetPassword, setResetPassword] = useState('');
    const [submitting, setSubmitting]   = useState(false);
    const [msg, setMsg]                 = useState('');
    const [err, setErr]                 = useState('');

    // Teacher Academic Access state
    const [teacherAccessList, setTeacherAccessList] = useState([]);
    const [accessLoading, setAccessLoading]         = useState(false);
    const [accessForm, setAccessForm]               = useState({
        academicYear: 1,
        branch: 'CSE',
        section: 'A',
        subsection: 'ALL'
    });

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/teachers?search=${encodeURIComponent(search)}&status=${statusFilter}`);
            if (res.data.success) {
                setTeachers(res.data.teachers);
                setTotal(res.data.count);
            }
        } catch {
            setErr('Failed to load teachers');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTeachers();
    }, [search, statusFilter]);

    const openCreate = () => {
        setForm({ name: '', email: '', password: '', subject: '' });
        setModal('create');
        setErr('');
        setMsg('');
    };

    const openEdit = (t) => {
        setSelected(t);
        setForm({ name: t.name, email: t.email, subject: t.subject || '' });
        setModal('edit');
        setErr('');
        setMsg('');
    };

    const openReset = (t) => {
        setSelected(t);
        setResetPassword('');
        setModal('reset');
        setErr('');
        setMsg('');
    };

    const openDelete = (t) => {
        setSelected(t);
        setModal('delete');
        setErr('');
        setMsg('');
    };

    const openAccess = async (t) => {
        setSelected(t);
        setModal('access');
        setErr('');
        setMsg('');
        setAccessForm({
            academicYear: 1,
            branch: 'CSE',
            section: 'A',
            subsection: 'ALL'
        });
        setTeacherAccessList(t.academicAccess || []);
        setAccessLoading(true);
        try {
            const res = await api.get(`/admin/teachers/${t.id}/access`);
            if (res.data.success) {
                setTeacherAccessList(res.data.access || []);
            }
        } catch (e) {
            console.error('Error fetching teacher access:', e);
        }
        setAccessLoading(false);
    };

    const closeModal = () => {
        setModal(null);
        setSelected(null);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErr('');
        try {
            const res = await api.post('/admin/teachers', form);
            if (res.data.success) {
                setMsg('Teacher created successfully!');
                fetchTeachers();
                setTimeout(closeModal, 1200);
            } else {
                setErr(res.data.message);
            }
        } catch (e) {
            setErr(e.response?.data?.message || 'Error creating teacher');
        }
        setSubmitting(false);
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErr('');
        try {
            const teacherId = selected.id || selected._id;
            const res = await api.put(`/admin/teachers/${teacherId}`, form);
            if (res.data.success) {
                setMsg('Teacher updated successfully!');
                fetchTeachers();
                setTimeout(closeModal, 1200);
            } else {
                setErr(res.data.message);
            }
        } catch (e) {
            setErr(e.response?.data?.message || 'Error updating teacher');
        }
        setSubmitting(false);
    };

    const handleArchiveToggle = async (t) => {
        const isArchived = t.status === 'archived';
        const actionLabel = isArchived ? 'restore' : 'archive';
        if (!window.confirm(`${isArchived ? 'Restore' : 'Archive'} teacher ${t.name}?`)) return;
        try {
            const teacherId = t.id || t._id;
            const res = await api.put(`/admin/teachers/${teacherId}/archive`);
            if (res.data.success) {
                fetchTeachers();
            }
        } catch (e) {
            setErr(e.response?.data?.message || `Failed to ${actionLabel} teacher`);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        setSubmitting(true);
        setErr('');
        try {
            const teacherId = selected.id || selected._id;
            const res = await api.delete(`/admin/teachers/${teacherId}`);
            if (res.data.success) {
                setMsg('Teacher permanently deleted!');
                fetchTeachers();
                setTimeout(closeModal, 1200);
            } else {
                setErr(res.data.message);
            }
        } catch (e) {
            setErr(e.response?.data?.message || 'Error deleting teacher');
        }
        setSubmitting(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErr('');
        try {
            const teacherId = selected.id || selected._id;
            const res = await api.put(`/admin/teachers/${teacherId}/reset-password`, { newPassword: resetPassword });
            if (res.data.success) {
                setMsg('Password reset successfully!');
                setTimeout(closeModal, 1200);
            } else {
                setErr(res.data.message);
            }
        } catch (e) {
            setErr(e.response?.data?.message || 'Error resetting password');
        }
        setSubmitting(false);
    };

    const handleAssignAccess = async (e) => {
        e.preventDefault();
        if (!selected) return;
        setSubmitting(true);
        setErr('');
        setMsg('');
        try {
            const teacherId = selected.id || selected._id;
            const payload = {
                academicYear: parseInt(accessForm.academicYear, 10),
                branch: accessForm.branch,
                section: accessForm.section,
                subsection: accessForm.subsection
            };
            const res = await api.post(`/admin/teachers/${teacherId}/access`, payload);
            if (res.data.success) {
                setMsg('Student batch access assigned successfully!');
                const refreshed = await api.get(`/admin/teachers/${teacherId}/access`);
                if (refreshed.data.success) {
                    setTeacherAccessList(refreshed.data.access || []);
                }
                fetchTeachers();
            } else {
                setErr(res.data.message || 'Failed to assign access');
            }
        } catch (e) {
            setErr(e.response?.data?.message || 'Error assigning academic access');
        }
        setSubmitting(false);
    };

    const handleRevokeAccess = async (accessId) => {
        if (!selected) return;
        setErr('');
        setMsg('');
        try {
            const teacherId = selected.id || selected._id;
            const res = await api.delete(`/admin/teachers/${teacherId}/access/${accessId}`);
            if (res.data.success) {
                setMsg('Batch access revoked.');
                setTeacherAccessList(prev => prev.filter(a => a.id !== accessId));
                fetchTeachers();
            } else {
                setErr(res.data.message || 'Failed to revoke access');
            }
        } catch (e) {
            setErr(e.response?.data?.message || 'Error revoking access');
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Teachers</h1>
                    <p className="text-sm text-zinc-400">
                        {total} {statusFilter === 'all' ? 'total' : statusFilter} teacher account(s)
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 transition-colors shadow-sm"
                >
                    <UserPlus className="h-4 w-4" /> Add Teacher
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full sm:max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none"
                />
                
                {/* Status Tabs */}
                <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                    {['active', 'archived', 'all'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                                statusFilter === status
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {err && !modal && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                    {err}
                </div>
            )}

            {/* Table (Horizontal scroll on mobile) */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
                <table className="min-w-[720px] w-full text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950">
                        <tr>
                            {['Name', 'Email', 'Subject', 'Student Access', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={6} className="py-8 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                        ) : teachers.length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-zinc-500">No teachers found</td></tr>
                        ) : teachers.map(t => {
                            const isArchived = t.status === 'archived';
                            const teacherKey = t.id || t._id;
                            const accessList = t.academicAccess || [];
                            return (
                                <tr key={teacherKey} className="hover:bg-zinc-800/40 transition-colors">
                                    <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                                    <td className="px-4 py-3 text-zinc-400">{t.email}</td>
                                    <td className="px-4 py-3 text-zinc-400">{t.subject || '–'}</td>
                                    <td className="px-4 py-3">
                                        {accessList.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {accessList.slice(0, 2).map((acc) => (
                                                    <span 
                                                        key={acc.id} 
                                                        className="inline-flex items-center rounded-md bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 text-[11px] font-medium text-blue-300"
                                                    >
                                                        Y{acc.academicYear} {acc.branch}-{acc.section} ({acc.subsection})
                                                    </span>
                                                ))}
                                                {accessList.length > 2 && (
                                                    <span className="inline-flex items-center rounded-md bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400">
                                                        +{accessList.length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                                                No access assigned
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                            t.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                                        }`}>{t.status}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => openAccess(t)}
                                                title="Manage Student Access"
                                                className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                                            >
                                                <GraduationCap className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => openEdit(t)}
                                                title="Edit Teacher"
                                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => openReset(t)}
                                                title="Reset Password"
                                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-amber-400 transition-colors"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleArchiveToggle(t)}
                                                title={isArchived ? "Restore Teacher" : "Archive Teacher"}
                                                className={`rounded-lg p-1.5 transition-colors ${
                                                    isArchived 
                                                        ? 'text-emerald-400 hover:bg-emerald-500/20' 
                                                        : 'text-zinc-400 hover:bg-zinc-700 hover:text-amber-400'
                                                }`}
                                            >
                                                {isArchived ? <RefreshCw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => openDelete(t)}
                                                title="Delete Teacher"
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

            {/* Create Modal */}
            {modal === 'create' && (
                <Modal title="Add Teacher" onClose={closeModal}>
                    <form onSubmit={handleCreate} className="space-y-3">
                        <Field label="Full Name"   value={form.name}     onChange={v => setForm(f => ({...f, name:v}))}     required placeholder="Jane Smith" />
                        <Field label="Email"       value={form.email}    onChange={v => setForm(f => ({...f, email:v}))}    required type="email" placeholder="jane@school.edu" />
                        <Field label="Password"    value={form.password} onChange={v => setForm(f => ({...f, password:v}))} required type="password" placeholder="Min 6 chars" />
                        <Field label="Subject"     value={form.subject}  onChange={v => setForm(f => ({...f, subject:v}))}  placeholder="Mathematics" />
                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
                        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50">
                            {submitting ? 'Creating…' : 'Create Teacher'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Edit Modal */}
            {modal === 'edit' && (
                <Modal title="Edit Teacher" onClose={closeModal}>
                    <form onSubmit={handleEdit} className="space-y-3">
                        <Field label="Full Name" value={form.name}    onChange={v => setForm(f => ({...f, name:v}))}    required placeholder="Jane Smith" />
                        <Field label="Email"     value={form.email}   onChange={v => setForm(f => ({...f, email:v}))}   required type="email" />
                        <Field label="Subject"   value={form.subject} onChange={v => setForm(f => ({...f, subject:v}))} placeholder="Mathematics" />
                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
                        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50">
                            {submitting ? 'Saving…' : 'Save Changes'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {modal === 'reset' && (
                <Modal title={`Reset Password — ${selected?.name}`} onClose={closeModal}>
                    <form onSubmit={handleResetPassword} className="space-y-3">
                        <Field label="New Password" type="password" value={resetPassword} onChange={setResetPassword} required placeholder="Min 6 characters" />
                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
                        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50">
                            {submitting ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {modal === 'delete' && (
                <Modal title="Delete Teacher" onClose={closeModal}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-white">Permanently Delete Teacher?</p>
                                <p className="text-xs text-red-300 mt-1">
                                    This action cannot be undone. It will permanently remove:
                                </p>
                                <ul className="list-disc list-inside text-xs text-red-300 mt-1 space-y-0.5">
                                    <li>Teacher profile &amp; login account</li>
                                    <li>Class &amp; subject assignments</li>
                                    <li>Associated attendance sessions</li>
                                </ul>
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3 text-sm">
                            <p className="font-medium text-white">{selected?.name}</p>
                            <p className="text-xs text-zinc-400">{selected?.email}</p>
                            {selected?.subject && <p className="text-xs text-zinc-400 mt-0.5">Subject: {selected.subject}</p>}
                        </div>

                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={closeModal}
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
                                        <Trash2 className="h-4 w-4" /> Delete Teacher
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Manage Academic Access Modal */}
            {modal === 'access' && (
                <Modal title={`Manage Student Access — ${selected?.name}`} onClose={closeModal} maxWidth="max-w-2xl">
                    <div className="space-y-5">
                        {/* Information banner */}
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-300 flex items-start gap-2.5">
                            <BookOpen className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-400" />
                            <div>
                                <p className="font-semibold text-blue-200">Administration Access Control</p>
                                <p className="mt-0.5 text-blue-300/90 leading-relaxed">
                                    Teachers only have access to students within the academic batches assigned below.
                                    Assign multiple academic year, branch, section, and subsection batches as needed.
                                </p>
                            </div>
                        </div>

                        {/* Current Assigned Access List */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" /> Assigned Student Batches ({teacherAccessList.length})
                                </h4>
                            </div>

                            {accessLoading ? (
                                <div className="py-6 text-center text-zinc-500">
                                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                </div>
                            ) : teacherAccessList.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-center">
                                    <p className="text-xs text-amber-400 font-medium">No student batches assigned yet</p>
                                    <p className="text-[11px] text-zinc-500 mt-1">This teacher currently has no student access. Assign one below.</p>
                                </div>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                    {teacherAccessList.map(a => (
                                        <div 
                                            key={a.id} 
                                            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/40 px-3.5 py-2.5 hover:border-zinc-700 transition-colors"
                                        >
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <span className="font-semibold text-white">Year {a.academicYear}</span>
                                                <span className="text-zinc-500">•</span>
                                                <span className="rounded-md bg-blue-500/20 text-blue-300 px-2 py-0.5 font-medium">
                                                    {a.branch}
                                                </span>
                                                <span className="rounded-md bg-purple-500/20 text-purple-300 px-2 py-0.5 font-medium">
                                                    Section {a.section}
                                                </span>
                                                <span className="rounded-md bg-emerald-500/20 text-emerald-300 px-2 py-0.5 font-medium">
                                                    {a.subsection === 'ALL' ? 'All Subsections' : `Subsection ${a.subsection}`}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRevokeAccess(a.id)}
                                                title="Revoke batch access"
                                                className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Grant New Access Form */}
                        <form onSubmit={handleAssignAccess} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                                <Plus className="h-3.5 w-3.5 text-emerald-400" /> Grant Student Batch Access
                            </h4>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">Academic Year</label>
                                    <select
                                        value={accessForm.academicYear}
                                        onChange={e => setAccessForm(f => ({ ...f, academicYear: Number(e.target.value) }))}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-xs text-white focus:border-white focus:outline-none"
                                    >
                                        {VALID_ACADEMIC_YEARS.map(y => (
                                            <option key={y.value} value={y.value}>{y.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">Branch</label>
                                    <select
                                        value={accessForm.branch}
                                        onChange={e => setAccessForm(f => ({ ...f, branch: e.target.value }))}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-xs text-white focus:border-white focus:outline-none"
                                    >
                                        {VALID_BRANCHES.map(b => (
                                            <option key={b.value} value={b.value}>{b.value}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">Section</label>
                                    <select
                                        value={accessForm.section}
                                        onChange={e => {
                                            const sec = e.target.value;
                                            setAccessForm(f => ({
                                                ...f,
                                                section: sec,
                                                subsection: 'ALL'
                                            }));
                                        }}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-xs text-white focus:border-white focus:outline-none"
                                    >
                                        {VALID_SECTIONS.map(s => (
                                            <option key={s} value={s}>Section {s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">Subsection</label>
                                    <select
                                        value={accessForm.subsection}
                                        onChange={e => setAccessForm(f => ({ ...f, subsection: e.target.value }))}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-xs text-white focus:border-white focus:outline-none"
                                    >
                                        <option value="ALL">All Subsections</option>
                                        {(VALID_SUBSECTIONS[accessForm.section] || []).map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {err && <p className="text-xs text-red-400">{err}</p>}
                            {msg && <p className="text-xs text-emerald-400">{msg}</p>}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-semibold text-black hover:bg-zinc-100 transition-colors disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Granting Access…
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-3.5 w-3.5" /> Grant Access to Batch
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TeacherManagement;
