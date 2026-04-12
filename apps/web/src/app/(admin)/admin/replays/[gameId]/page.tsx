import { getAdminReplayDetail, getAdminMp4DownloadUrl } from "@/app/actions/replays";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { ArrowLeft, Film, Shield, BookOpen, Users, Trophy, Clock, Layers, Video, Download, Loader2, AlertCircle } from "lucide-react";
import { AdminReplayViewer } from "./AdminReplayViewer";

export default async function AdminReplayDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const { replay, ledger } = await getAdminReplayDetail(gameId);

  if (!replay) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-bold text-slate-500">Repetición no encontrada</p>
        <Link href="/admin/replays" className="text-purple-400 font-bold hover:underline">
          Volver a Repeticiones
        </Link>
      </div>
    );
  }

  const mp4DownloadUrl = replay.mp4_status === 'ready' ? await getAdminMp4DownloadUrl(gameId) : null;

  const players = replay.players || [];
  const pot = replay.pot_breakdown || {};
  const hands = replay.final_hands || {};
  const timeline = replay.admin_timeline || replay.timeline || [];

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="pb-6 border-b border-white/5">
        <Link
          href="/admin/replays"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Repeticiones
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
              <Film className="w-8 h-8 text-purple-400" />
              AUDITORÍA DE PARTIDA
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 tracking-widest flex items-center gap-1">
                <Shield className="w-3 h-3" />
                MODO ADMIN
              </span>
              <span className="text-xs font-mono text-slate-500">
                ID: {gameId.substring(0, 12)}...
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {new Date(replay.created_at).toLocaleDateString('es-ES', {
              day: '2-digit', month: 'long', year: 'numeric'
            })}
            {' · '}
            {new Date(replay.created_at).toLocaleTimeString('es-ES', {
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })}
          </div>
        </div>
      </div>

      {/* Game Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jugadores</span>
          </div>
          <p className="text-2xl font-black text-white">{players.length}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {players.map(p => (
              <span key={p.userId} className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400">
                {p.nickname}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-brand-gold" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bote Total</span>
          </div>
          <p className="text-2xl font-black text-brand-gold">{formatCurrency(pot.totalPot || 0)}</p>
          <p className="text-[10px] text-slate-600">
            Principal: {formatCurrency(pot.mainPot || 0)} · Pique: {formatCurrency(pot.piquePot || 0)}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rake</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatCurrency(pot.rake || 0)}</p>
          <p className="text-[10px] text-slate-600">
            Pot: {formatCurrency(pot.potRake || 0)} · Pique: {formatCurrency(pot.piqueRake || 0)}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Eventos</span>
          </div>
          <p className="text-2xl font-black text-white">{timeline.length}</p>
          <p className="text-[10px] text-slate-600">
            Seed: {replay.rng_seed?.substring(0, 16)}...
          </p>
        </div>
      </div>

      {/* MP4 Video Status */}
      {replay.mp4_status && (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-purple-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Video MP4</h3>
              {replay.mp4_status === 'ready' && (
                <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-widest">
                  Listo
                </span>
              )}
              {replay.mp4_status === 'processing' && (
                <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 tracking-widest flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Procesando
                </span>
              )}
              {replay.mp4_status === 'pending' && (
                <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-widest">
                  En Cola
                </span>
              )}
              {replay.mp4_status === 'failed' && (
                <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 tracking-widest flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Error
                </span>
              )}
            </div>
            {mp4DownloadUrl && (
              <a
                href={mp4DownloadUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-400 transition-all"
              >
                <Download className="w-4 h-4" />
                Descargar MP4
              </a>
            )}
          </div>
          {replay.mp4_status === 'ready' && (
            <div className="flex gap-6 mt-3 text-[10px] text-slate-500">
              {replay.mp4_size_bytes && (
                <span>Tamaño: {(replay.mp4_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
              )}
              {replay.mp4_duration_ms && (
                <span>Duración: {Math.round(replay.mp4_duration_ms / 1000)}s</span>
              )}
              {replay.mp4_rendered_at && (
                <span>Renderizado: {new Date(replay.mp4_rendered_at).toLocaleString('es-ES')}</span>
              )}
            </div>
          )}
          {replay.mp4_status === 'failed' && replay.mp4_error && (
            <p className="mt-3 text-xs text-red-400/80 font-mono bg-red-500/5 rounded-xl p-3 border border-red-500/10">
              {replay.mp4_error}
            </p>
          )}
        </div>
      )}

      {/* Final Hands */}
      {Object.keys(hands).length > 0 && (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Manos Finales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(hands).map(([userId, hand]: [string, any]) => (
              <div key={userId} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <p className="font-black text-white text-sm mb-1">{hand.nickname}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold mb-2">{hand.handType}</p>
                <div className="flex gap-1 flex-wrap">
                  {hand.cards?.split(',').filter(Boolean).map((card: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-black/50 rounded-lg text-xs font-black text-brand-gold border border-brand-gold/20">
                      {card}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Timeline Viewer */}
      <AdminReplayViewer timeline={timeline} players={players} />

      {/* Financial Ledger */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Registros del Ledger ({ledger.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Débito</th>
                <th className="px-6 py-4 text-right">Crédito</th>
                <th className="px-6 py-4 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ledger.map(entry => {
                const player = players.find(p => p.userId === entry.user_id);
                return (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3 text-xs font-mono text-slate-500">
                      {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-white">
                      {player?.nickname || entry.user_id?.substring(0, 8)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        entry.type === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                        entry.type === 'bet' ? 'bg-red-500/20 text-red-400' :
                        entry.type === 'rake' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-black text-red-400 text-xs">
                      {entry.direction === 'debit' ? formatCurrency(entry.amount_cents) : ''}
                    </td>
                    <td className="px-6 py-3 text-right font-black text-emerald-400 text-xs">
                      {entry.direction === 'credit' ? formatCurrency(entry.amount_cents) : ''}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-400">
                      {formatCurrency(entry.balance_after_cents)}
                    </td>
                  </tr>
                );
              })}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                    Sin registros financieros para esta partida.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
