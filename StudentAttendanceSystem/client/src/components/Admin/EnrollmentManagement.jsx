import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">{children}</div>
        </div>
    </div>
);

const EnrollmentManagement = () => {
    const [enrollments, setEnrollments] = useState([]);
    const [students, setStudents]       = useState([]);
    const [classes, setClasses]         = useState([]);
    const [subjects, setSubjects]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [modal, setModal]             = useState(false);
    const [form, setForm]               = useState({ studentId: '', classId: '', subjectId: '', academicSession: '' });
    const [submitting, setSubmitting]   = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    // Filter state
    const [filterClass, setFilterClass]     = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    const fetchAll = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterClass)   params.append('classId', filterClass);
            if (filterSubject) params.append('subjectId', filterSubject);
            const r = await api.get(`/admin/enrollments?${params}`);
            if (r.data.success) setEnrollments(r.data.enrollments);
        } catch { setErr('Failed to load'); }
        setLoading(false);
    };

    const fetchMeta = async () => {
        const [sc, cc, subr] = await Promise.all([
            api.get('/admin/students?limit=200'),
            api.get('/admin/classes'),
            api.get('/admin/subjects')
        ]);
        if (sc.data.success)   setStudents(sc.data.students);
        if (cc.data.success)   setClasses(cc.data.classes);
        if (subr.data.success) setSubjects(subr.data.subjects);
    };

    useEffect(() => { fetchMeta(); }, []);
    useEffect(() => { fetchAll(); }, [filterClass, filterSubject]);

    const filteredSubjects = form.classId ? subjects.filter(s => s.classId?._id === form.classId || s.classId === form.classId) : subjects;

    const handleEnroll = async (e) => {
        e.preventDefault(); setSubmitting(true); setErr('');
        try {
            const r = await api.post('/admin/enrollments', form);
            if (r.data.success) { setMsg('Enrolled!'); fetchAll(); setTimeout(() => setModal(false), 1200); }
            else setErr(r.data.message);
        } catch (ex) { setErr(ex.response?.data?.message || 'Error'); }
        setSubmitting(false);
    };

    const handleDrop = async (id) => {
        if (!window.confirm('Drop this enrollment?')) return;
        try { await api.delete(`/admin/enrollments/${id}`); fetchAll(); }
        catch { setErr('Failed to drop'); }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Enrollments</h1>
                    <p className="text-sm text-zinc-400">Manage student–subject enrollments</p>
                </div>
                <button onClick={() => { setForm({ studentId:'', classId:'', subjectId:'', academicSession:'' }); setMsg(''); setErr(''); setModal(true); }}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100">
                    <Plus className="h-4 w-4" /> Enroll Student
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterSubject(''); }}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                </select>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                    <option value="">All Subjects</option>
                    {(filterClass ? subjects.filter(s => (s.classId?.id || s.classId?._id || s.classId) === filterClass) : subjects).map(s =>
                        <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
                    )}
                </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950">
                        <tr>
                            {['Student', 'ID', 'Class', 'Subject', 'Session', 'Status', ''].map((h, i) => (
                                <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" /></td></tr>
                        ) : enrollments.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-zinc-500">No enrollments found</td></tr>
                        ) : enrollments.map(e => (
                            <tr key={e.id || e._id} className="hover:bg-zinc-800/40">
                                <td className="px-4 py-3 font-medium text-white">{e.studentId?.name || e.student?.name || '–'}</td>
                                <td className="px-4 py-3 font-mono text-xs text-zinc-400">{e.studentId?.studentId || e.student?.studentId || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{e.classId?.name || e.class?.name || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{e.subjectId?.name || e.subject?.name || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{e.academicSession || '–'}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                        e.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                    }`}>{e.status}</span>
                                </td>
                                <td className="px-4 py-3">
                                    {e.status === 'active' && (
                                        <button onClick={() => handleDrop(e.id || e._id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-red-400">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <Modal title="Enroll Student" onClose={() => setModal(false)}>
                    <form onSubmit={handleEnroll} className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-400">Student *</label>
                            <select value={form.studentId} onChange={e => setForm(f => ({...f, studentId: e.target.value}))} required
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                                <option value="">Select student</option>
                                {students.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.studentId})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-400">Class *</label>
                            <select value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value, subjectId: ''}))} required
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                                <option value="">Select class</option>
                                {classes.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name} ({c.code})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-400">Subject *</label>
                            <select value={form.subjectId} onChange={e => setForm(f => ({...f, subjectId: e.target.value}))} required
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                                <option value="">Select subject</option>
                                {filteredSubjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-400">Academic Session *</label>
                            <input value={form.academicSession} onChange={e => setForm(f => ({...f, academicSession: e.target.value}))} required placeholder="2024-25"
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
                        </div>
                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
                        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black disabled:opacity-50">
                            {submitting ? 'Enrolling…' : 'Enroll Student'}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default EnrollmentManagement;
