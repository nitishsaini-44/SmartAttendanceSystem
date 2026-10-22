import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Shield, Loader2 } from 'lucide-react';

const actionColor = (action) => {
    if (action.startsWith('CREATE'))   return 'bg-emerald-500/20 text-emerald-400';
    if (action.startsWith('UPDATE'))   return 'bg-blue-500/20 text-blue-400';
    if (action.startsWith('ARCHIVE'))  return 'bg-amber-500/20 text-amber-400';
    if (action.startsWith('DELETE'))   return 'bg-red-500/20 text-red-400';
    if (action.startsWith('RESET'))    return 'bg-violet-500/20 text-violet-400';
    if (action.startsWith('CORRECT'))  return 'bg-pink-500/20 text-pink-400';
    return 'bg-zinc-700 text-zinc-400';
};

const AuditLogs = () => {
    const [logs, setLogs]     = useState([]);
    const [total, setTotal]   = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage]     = useState(1);
    const [search, setSearch] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: 50 });
        if (search) params.append('action', search);
        try {
            const r = await api.get(`/admin/audit-logs?${params}`);
            if (r.data.success) { setLogs(r.data.logs); setTotal(r.data.count); }
        } catch { /* no-op */ }
        setLoading(false);
    };

    useEffect(() => { fetchLogs(); }, [page, search]);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                <p className="text-sm text-zinc-400">{total} event(s) logged</p>
            </div>

            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Filter by action (e.g. CREATE_TEACHER)…"
                className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none" />

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-zinc-400" /></div>
                ) : logs.length === 0 ? (
                    <p className="py-10 text-center text-zinc-500">No audit logs found.</p>
                ) : logs.map(log => (
                    <div key={log.id || log._id} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40">
                        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColor(log.action)}`}>
                                    {log.action.replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm font-medium text-white">{log.actorName || 'Unknown'}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-xs ${
                                    log.actorRole === 'admin'   ? 'border-amber-500/30 text-amber-400'   :
                                    log.actorRole === 'teacher' ? 'border-emerald-500/30 text-emerald-400' :
                                    'border-blue-500/30 text-blue-400'
                                }`}>{log.actorRole}</span>
                            </div>
                            {log.targetModel && (
                                <p className="text-xs text-zinc-500">
                                    Target: {log.targetModel}
                                    {log.targetId && <span className="ml-1 font-mono">{log.targetId.toString().slice(-8)}</span>}
                                </p>
                            )}
                            {log.changes && Object.keys(log.changes).length > 0 && (
                                <p className="truncate text-xs text-zinc-600">{JSON.stringify(log.changes)}</p>
                            )}
                        </div>
                        <span className="flex-shrink-0 text-xs text-zinc-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-40 hover:border-zinc-500">← Prev</button>
                <span className="text-sm text-zinc-400">Page {page}</span>
                <button disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}
                    className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-40 hover:border-zinc-500">Next →</button>
            </div>
        </div>
    );
};

export default AuditLogs;
