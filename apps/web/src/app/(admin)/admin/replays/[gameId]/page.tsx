import { getAdminReplayDetail } from "@/app/actions/replays";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { ArrowLeft, Film, Shield, BookOpen, Users, Trophy, Clock, Layers } from "lucide-react";
import { ReplayController } from "@/components/replay/ReplayController";
import { ResponsiveDataView } from "@/components/admin/ResponsiveDataView";

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

      {/* Final Hands */}
      {Object.keys(hands).length > 0 && (() => {
        const handsCount = Object.keys(hands).length;
        const gridCls =
          handsCount <= 1 ? 'grid-cols-1'
          : handsCount === 2 ? 'grid-cols-1 sm:grid-cols-2'
          : handsCount === 3 ? 'grid-cols-1 sm:grid-cols-3'
          : handsCount === 4 ? 'grid-cols-2 lg:grid-cols-4'
          : handsCount <= 6 ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
        return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Manos Finales</h3>
          <div className={`grid ${gridCls} gap-4`}>
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
        );
      })()}

      {/* Visual replay (v2): única vista del replay */}
      {replay.version === 2 && replay.frames && replay.frames.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Reconstrucción Visual</h2>
          <ReplayController frames={replay.frames as any} />
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8 text-center">
          <p className="text-sm font-bold text-slate-400">
            Esta repetición es de versión 1 (legacy) y no incluye frames visuales reproducibles.
          </p>
        </div>
      )}

      {/* Financial Ledger */}
      <ResponsiveDataView
        columns={[
          {
            key: "time",
            header: "Hora",
            render: (entry) => (
              <span className="text-xs font-mono text-slate-500">
                {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            ),
          },
          {
            key: "user",
            header: "Usuario",
            render: (entry) => {
              const player = players.find(p => p.userId === entry.user_id);
              return (
                <span className="text-xs font-bold text-white">
                  {player?.nickname || entry.user_id?.substring(0, 8)}
                </span>
              );
            },
          },
          {
            key: "type",
            header: "Tipo",
            render: (entry) => (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                entry.type === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                entry.type === 'bet' ? 'bg-red-500/20 text-red-400' :
                entry.type === 'rake' ? 'bg-blue-500/20 text-blue-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {entry.type}
              </span>
            ),
          },
          {
            key: "debit",
            header: "Débito",
            headerAlign: "right",
            align: "right",
            render: (entry) => (
              <span className="font-black text-red-400 text-xs">
                {entry.direction === 'debit' ? formatCurrency(entry.amount_cents) : ''}
              </span>
            ),
          },
          {
            key: "credit",
            header: "Crédito",
            headerAlign: "right",
            align: "right",
            render: (entry) => (
              <span className="font-black text-emerald-400 text-xs">
                {entry.direction === 'credit' ? formatCurrency(entry.amount_cents) : ''}
              </span>
            ),
          },
          {
            key: "balance",
            header: "Saldo",
            headerAlign: "right",
            align: "right",
            render: (entry) => (
              <span className="font-mono text-xs text-slate-400">
                {formatCurrency(entry.balance_after_cents)}
              </span>
            ),
          },
        ]}
        data={ledger}
        keyExtractor={(entry) => entry.id}
        emptyMessage="Sin registros financieros para esta partida."
        header={
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Registros del Ledger ({ledger.length})
            </h3>
          </div>
        }
        renderCard={(entry) => {
          const player = players.find(p => p.userId === entry.user_id);
          return (
            <div className="space-y-2">
              {/* Header: user + type + time */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{player?.nickname || entry.user_id?.substring(0, 8)}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    entry.type === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                    entry.type === 'bet' ? 'bg-red-500/20 text-red-400' :
                    entry.type === 'rake' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {entry.type}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              {/* Amount + balance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                    {entry.direction === 'debit' ? 'Débito' : 'Crédito'}
                  </p>
                  <p className={`font-black ${entry.direction === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {entry.direction === 'credit' ? '+' : '-'}{formatCurrency(entry.amount_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Saldo</p>
                  <p className="font-mono text-slate-300">{formatCurrency(entry.balance_after_cents)}</p>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
