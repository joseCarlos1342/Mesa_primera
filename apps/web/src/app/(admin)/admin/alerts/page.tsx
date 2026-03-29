'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertTriangle, ShieldAlert, Wrench, HelpCircle, Clock, CheckCircle2, XCircle, Eye, ArrowLeft, Tv } from 'lucide-react';
import Link from 'next/link';

interface HelpRequest {
  id: string;
  user_id: string;
  room_id: string;
  reason: string;
  message: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  // joined
  username?: string;
}

const REASON_META: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
  dispute:     { label: 'Disputa',       icon: AlertTriangle, color: 'text-amber-400' },
  unfair_play: { label: 'Juego Desleal', icon: ShieldAlert,   color: 'text-red-400' },
  technical:   { label: 'Técnico',       icon: Wrench,        color: 'text-blue-400' },
  other:       { label: 'Otro',          icon: HelpCircle,    color: 'text-slate-400' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  attending: { label: 'Atendiendo', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  resolved:  { label: 'Resuelto',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  dismissed: { label: 'Descartado', color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function AdminAlertsPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [updating, setUpdating] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});

  const supabase = createClient();

  // Initial fetch
  useEffect(() => {
    async function load() {
      setLoading(true);
      const query = supabase
        .from('table_help_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'active') {
        query.in('status', ['pending', 'attending']);
      }

      const { data } = await query;
      if (data) {
        // Fetch usernames
        const userIds = [...new Set(data.map((r: HelpRequest) => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: { id: string; username: string }) => [p.id, p.username] as const));
        setRequests(data.map((r: HelpRequest) => ({ ...r, username: profileMap.get(r.user_id) || 'Desconocido' })));
      }
      setLoading(false);
    }
    load();
  }, [filter]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-help-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_help_requests' },
        async (payload: { eventType: string; new: Record<string, unknown> }) => {
          if (payload.eventType === 'INSERT') {
            const newReq = payload.new as unknown as HelpRequest;
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', newReq.user_id)
              .single();
            newReq.username = profile?.username || 'Desconocido';

            setRequests(prev => [newReq, ...prev]);

            // Play alert sound
            try {
              const audio = new Audio('/sounds/alert.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch {}
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as unknown as HelpRequest;
            setRequests(prev =>
              prev.map(r => r.id === updated.id ? { ...r, ...updated } : r)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function updateStatus(id: string, status: 'attending' | 'resolved' | 'dismissed') {
    setUpdating(id);
    const updateData: Record<string, unknown> = { status };
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolved_at = new Date().toISOString();
      if (notesInput[id]?.trim()) {
        updateData.admin_notes = notesInput[id].trim();
      }
    }
    await supabase
      .from('table_help_requests')
      .update(updateData)
      .eq('id', id);
    setUpdating(null);
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const attendingCount = requests.filter(r => r.status === 'attending').length;

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-widest mb-3 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Centro de Mando
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${pendingCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
              ALERTAS DE MESA
            </h1>
          </div>
          <p className="text-slate-500 font-medium mt-1">Solicitudes de ayuda de jugadores en tiempo real.</p>
        </div>

        {/* Counters */}
        <div className="flex gap-3">
          <div className={`px-5 py-3 rounded-2xl border ${pendingCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-900/50 border-white/5'}`}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pendientes</p>
            <p className={`text-2xl font-black ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{pendingCount}</p>
          </div>
          <div className={`px-5 py-3 rounded-2xl border ${attendingCount > 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-900/50 border-white/5'}`}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atendiendo</p>
            <p className={`text-2xl font-black ${attendingCount > 0 ? 'text-blue-400' : 'text-slate-600'}`}>{attendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
            filter === 'active'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900/50 border border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          Activas
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900/50 border border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          Historial
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-16 h-16 text-emerald-500/30 mx-auto mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
            {filter === 'active' ? 'Sin alertas activas' : 'No hay solicitudes'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const reasonMeta = REASON_META[req.reason] || REASON_META.other;
            const statusMeta = STATUS_META[req.status] || STATUS_META.pending;
            const ReasonIcon = reasonMeta.icon;
            const isActive = req.status === 'pending' || req.status === 'attending';

            return (
              <div
                key={req.id}
                className={`relative backdrop-blur-lg border rounded-[1.5rem] p-6 transition-all ${
                  req.status === 'pending'
                    ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]'
                    : req.status === 'attending'
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : 'bg-slate-900/30 border-white/5 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <ReasonIcon className={`w-5 h-5 ${reasonMeta.color}`} />
                      <span className={`font-black text-sm uppercase tracking-widest ${reasonMeta.color}`}>
                        {reasonMeta.label}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                      <span className="text-slate-600 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(req.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white font-bold">{req.username}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 font-mono text-xs break-all">Mesa: {req.room_id}</span>
                    </div>

                    {req.message && (
                      <p className="text-slate-300 text-sm bg-black/20 rounded-xl px-4 py-3 border border-white/5 leading-relaxed">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}

                    {req.admin_notes && (
                      <p className="text-slate-500 text-xs italic">
                        Nota admin: {req.admin_notes}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {isActive && (
                    <div className="flex flex-col gap-2 md:min-w-[200px]">
                      {req.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(req.id, 'attending')}
                          disabled={updating === req.id}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 active:scale-95"
                        >
                          <Eye className="w-4 h-4" />
                          Atender
                        </button>
                      )}

                      <Link
                        href={`/admin/spectate/${req.room_id}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                      >
                        <Tv className="w-4 h-4" />
                        Observar Mesa
                      </Link>

                      <input
                        type="text"
                        placeholder="Nota (opcional)..."
                        value={notesInput[req.id] || ''}
                        onChange={(e) => setNotesInput(prev => ({ ...prev, [req.id]: e.target.value }))}
                        className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(req.id, 'resolved')}
                          disabled={updating === req.id}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolver
                        </button>
                        <button
                          onClick={() => updateStatus(req.id, 'dismissed')}
                          disabled={updating === req.id}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-600/20 hover:bg-slate-600/40 border border-slate-500/20 text-slate-400 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Descartar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
