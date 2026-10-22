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

const AssignmentManagement = () => {
    const [assignments, setAssignments] = useState([]);
    const [teachers, setTeachers]       = useState([]);
    const [classes, setClasses]         = useState([]);
    const [subjects, setSubjects]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [modal, setModal]             = useState(false);
    const [form, setForm]               = useState({ teacherId: '', classId: '', subjectId: '', academicSession: '' });
    const [submitting, setSubmitting]   = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const fetchAll = async () => {
        setLoading(true);
        try {
            const r = await api.get('/admin/assignments');
            if (r.data.success) setAssignments(r.data.assignments);
        } catch { setErr('Failed to load'); }
        setLoading(false);
    };

    useEffect(() => {
        Promise.all([
            api.get('/admin/teachers?limit=200'),
            api.get('/admin/classes'),
            api.get('/admin/subjects')
        ]).then(([tr, cr, sr]) => {
            if (tr.data.success) setTeachers(tr.data.teachers);
            if (cr.data.success) setClasses(cr.data.classes);
            if (sr.data.success) setSubjects(sr.data.subjects);
        });
        fetchAll();
    }, []);

    const filteredSubjects = form.classId
        ? subjects.filter(s => (s.classId?._id || s.classId) === form.classId)
        : subjects;

    const handleAssign = async (e) => {
        e.preventDefault(); setSubmitting(true); setErr('');
        try {
            const r = await api.post('/admin/assignments', form);
            if (r.data.success) { setMsg('Teacher assigned!'); fetchAll(); setTimeout(() => setModal(false), 1200); }
            else setErr(r.data.message);
        } catch (ex) { setErr(ex.response?.data?.message || 'Error'); }
        setSubmitting(false);
    };

    const handleDeactivate = async (id) => {
        if (!window.confirm('Deactivate this assignment?')) return;
        try { await api.delete(`/admin/assignments/${id}`); fetchAll(); }
        catch { setErr('Failed'); }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Teacher Assignments</h1>
                    <p className="text-sm text-zinc-400">Assign teachers to classes and subjects</p>
                </div>
                <button onClick={() => { setForm({ teacherId:'', classId:'', subjectId:'', academicSession:'' }); setMsg(''); setErr(''); setModal(true); }}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100">
                    <Plus className="h-4 w-4" /> Assign Teacher
                </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950">
                        <tr>
                            {['Teacher', 'Email', 'Class', 'Subject', 'Session', 'Status', ''].map((h, i) => (
                                <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" /></td></tr>
                        ) : assignments.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-zinc-500">No assignments yet</td></tr>
                        ) : assignments.map(a => (
                            <tr key={a.id || a._id} className="hover:bg-zinc-800/40">
                                <td className="px-4 py-3 font-medium text-white">{a.teacherId?.name || a.teacherUser?.name || a.teacherProfile?.name || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400 text-xs">{a.teacherId?.email || a.teacherUser?.email || a.teacherProfile?.email || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{a.classId?.name || a.class?.name || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{a.subjectId?.name || a.subject?.name || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{a.academicSession || '–'}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                        a.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                                    }`}>{a.status}</span>
                                </td>
                                <td className="px-4 py-3">
                                    {a.status === 'active' && (
                                        <button onClick={() => handleDeactivate(a.id || a._id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-red-400">
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
                <Modal title="Assign Teacher" onClose={() => setModal(false)}>
                    <form onSubmit={handleAssign} className="space-y-3">
                        {[
                            { label: 'Teacher *', field: 'teacherId', options: teachers.map(t => ({ value: t.id || t._id, label: `${t.name} — ${t.email}` })) },
                            { label: 'Class *',   field: 'classId',   options: classes.map(c => ({ value: c.id || c._id, label: `${c.name} (${c.code})` })) },
                            { label: 'Subject *', field: 'subjectId', options: filteredSubjects.map(s => ({ value: s.id || s._id, label: `${s.name} (${s.code})` })) },
                        ].map(({ label, field, options }) => (
                            <div key={field}>
                                <label className="mb-1 block text-xs font-medium text-zinc-400">{label}</label>
                                <select value={form[field]}
                                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value, ...(field === 'classId' ? { subjectId: '' } : {}) }))}
                                    required className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                                    <option value="">Select…</option>
                                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        ))}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-400">Academic Session *</label>
                            <input value={form.academicSession} onChange={e => setForm(f => ({...f, academicSession: e.target.value}))} required placeholder="2024-25"
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
                        </div>
                        {err && <p className="text-sm text-red-400">{err}</p>}
                        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
                        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black disabled:opacity-50">
                            {submitting ? 'Assigning…' : 'Assign Teacher'}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default AssignmentManagement;
