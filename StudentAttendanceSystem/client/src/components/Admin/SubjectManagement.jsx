import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Pencil, X, Loader2, BookOpen } from 'lucide-react';

const Field = ({ label, type='text', value, onChange, placeholder, required }) => (
    <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">{label}{required && ' *'}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" />
    </div>
);

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

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [filterClass, setFilterClass] = useState('');
    const [modal, setModal]       = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm]         = useState({ name: '', code: '', classId: '', academicSession: '', credits: '', attendanceThreshold: 75 });
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/admin/subjects?${filterClass ? `classId=${filterClass}` : ''}`);
            if (r.data.success) setSubjects(r.data.subjects);
        } catch { setErr('Failed to load'); }
        setLoading(false);
    };

    useEffect(() => { api.get('/admin/classes').then(r => { if (r.data.success) setClasses(r.data.classes); }); }, []);
    useEffect(() => { fetchSubjects(); }, [filterClass]);

    const setF = key => val => setForm(f => ({...f, [key]: val}));
    const openCreate = () => { setForm({ name:'', code:'', classId: filterClass, academicSession:'', credits:'', attendanceThreshold: 75 }); setModal('create'); setErr(''); setMsg(''); };
    const openEdit   = s  => { setSelected(s); setForm({ name: s.name, code: s.code, classId: s.classId?._id||'', academicSession: s.academicSession||'', credits: s.credits||'', attendanceThreshold: s.attendanceThreshold??75 }); setModal('edit'); setErr(''); setMsg(''); };
    const close = () => { setModal(null); setSelected(null); };

    const handleCreate = async (e) => {
        e.preventDefault(); setSubmitting(true); setErr('');
        try {
            const r = await api.post('/admin/subjects', form);
            if (r.data.success) { setMsg('Subject created!'); fetchSubjects(); setTimeout(close, 1200); }
            else setErr(r.data.message);
        } catch (ex) { setErr(ex.response?.data?.message || 'Error'); }
        setSubmitting(false);
    };

    const handleEdit = async (e) => {
        e.preventDefault(); setSubmitting(true); setErr('');
        try {
            const subjectId = selected.id || selected._id;
            const r = await api.put(`/admin/subjects/${subjectId}`, { name: form.name, credits: form.credits, attendanceThreshold: form.attendanceThreshold });
            if (r.data.success) { setMsg('Updated!'); fetchSubjects(); setTimeout(close, 1200); }
            else setErr(r.data.message);
        } catch (ex) { setErr(ex.response?.data?.message || 'Error'); }
        setSubmitting(false);
    };

    const SubjectForm = ({ onSubmit, isEdit, btnLabel }) => (
        <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <Field label="Subject Name" value={form.name} onChange={setF('name')} required placeholder="Data Structures" />
                <Field label="Code (unique)" value={form.code} onChange={setF('code')} required placeholder="CS301" />
            </div>
            {!isEdit && (
                <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Class *</label>
                    <select value={form.classId} onChange={e => setF('classId')(e.target.value)} required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                        <option value="">Select a class</option>
                        {classes.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name} ({c.code})</option>)}
                    </select>
                </div>
            )}
            {!isEdit && <Field label="Academic Session" value={form.academicSession} onChange={setF('academicSession')} placeholder="2024-25" />}
            <div className="grid grid-cols-2 gap-3">
                <Field label="Credits" type="number" value={form.credits} onChange={setF('credits')} placeholder="4" />
                <Field label="Min Attendance %" type="number" value={form.attendanceThreshold} onChange={setF('attendanceThreshold')} placeholder="75" />
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            {msg && <p className="text-sm text-emerald-400">{msg}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white py-2 text-sm font-medium text-black disabled:opacity-50">
                {submitting ? 'Saving…' : btnLabel}
            </button>
        </form>
    );

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Subjects</h1>
                    <p className="text-sm text-zinc-400">{subjects.length} subject(s)</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100">
                    <Plus className="h-4 w-4" /> New Subject
                </button>
            </div>

            {/* Filter by class */}
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name} ({c.code})</option>)}
            </select>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950">
                        <tr>
                            {['Subject', 'Code', 'Class', 'Session', 'Credits', 'Min %', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" /></td></tr>
                        ) : subjects.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-zinc-500">No subjects found</td></tr>
                        ) : subjects.map(s => (
                            <tr key={s.id || s._id} className="hover:bg-zinc-800/40">
                                <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                                <td className="px-4 py-3 font-mono text-xs text-zinc-400">{s.code}</td>
                                <td className="px-4 py-3 text-zinc-400">{s.classId?.name || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{s.academicSession || '–'}</td>
                                <td className="px-4 py-3 text-zinc-400">{s.credits || '–'}</td>
                                <td className="px-4 py-3">
                                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{s.attendanceThreshold}%</span>
                                </td>
                                <td className="px-4 py-3">
                                    <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"><Pencil className="h-4 w-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal === 'create' && <Modal title="New Subject" onClose={close}><SubjectForm onSubmit={handleCreate} isEdit={false} btnLabel="Create Subject" /></Modal>}
            {modal === 'edit'   && <Modal title="Edit Subject" onClose={close}><SubjectForm onSubmit={handleEdit}   isEdit={true}  btnLabel="Save Changes" /></Modal>}
        </div>
    );
};

export default SubjectManagement;
