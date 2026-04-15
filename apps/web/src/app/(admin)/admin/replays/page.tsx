import { getAllReplays } from "@/app/actions/replays";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { Film, Trophy, Users, Clock, Eye, BarChart3 } from "lucide-react";
import { ResponsiveDataView } from "@/components/admin/ResponsiveDataView";

export default async function AdminReplaysPage() {
  const replays = await getAllReplays(100);

  const totalRake = replays.reduce((sum, r) => sum + r.total_rake, 0);

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="pb-6 border-b border-white/5">
        <h1 className="text-3xl font-black italic tracking-tighter bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
          <Film className="w-8 h-8 text-purple-400" />
          REPETICIONES
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Todas las partidas jugadas del sistema ({replays.length} registros)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Partidas</span>
          </div>
          <p className="text-3xl font-black text-white">{replays.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rake Total</span>
          </div>
          <p className="text-3xl font-black text-emerald-400">{formatCurrency(totalRake)}</p>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jugadores Únicos</span>
          </div>
          <p className="text-3xl font-black text-white">
            {new Set(replays.flatMap(r => r.players?.map(p => p.userId) || [])).size}
          </p>
        </div>
      </div>

      {/* Replays Table */}
      <ResponsiveDataView
        columns={[
          {
            key: "date",
            header: "Fecha",
            render: (r) => (
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 whitespace-nowrap">
                <Clock className="w-3 h-3 shrink-0" />
                <div>
                  {new Date(r.played_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  <br />
                  <span className="text-slate-600">{new Date(r.played_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ),
          },
          {
            key: "players",
            header: "Jugadores",
            render: (r) => (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {r.players?.map(p => (
                    <span key={p.userId} className={`text-xs font-bold ${
                      p.userId === r.winner_id ? 'text-brand-gold' : 'text-slate-400'
                    }`}>
                      {p.nickname}
                    </span>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: "winner",
            header: "Ganador",
            render: (r) => {
              const winnerPlayer = r.players?.find(p => p.userId === r.winner_id);
              return (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-brand-gold shrink-0" />
                  <span className="font-black text-white text-xs">
                    {winnerPlayer?.nickname || '—'}
                  </span>
                </div>
              );
            },
          },
          {
            key: "pot",
            header: "Bote",
            headerAlign: "right",
            align: "right",
            render: (r) => (
              <span className="font-black text-white">{formatCurrency(r.total_pot)}</span>
            ),
          },
          {
            key: "rake",
            header: "Rake",
            headerAlign: "right",
            align: "right",
            render: (r) => (
              <span className="font-black text-emerald-400">{formatCurrency(r.total_rake)}</span>
            ),
          },
          {
            key: "action",
            header: "Acción",
            headerAlign: "center",
            align: "center",
            render: (r) => (
              <Link
                href={`/admin/replays/${r.game_id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-xs font-black uppercase tracking-widest"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver
              </Link>
            ),
          },
        ]}
        data={replays}
        keyExtractor={(r) => r.game_id}
        emptyMessage="No hay partidas registradas en el sistema."
        header={
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400" />
              Historial de Partidas
            </h3>
          </div>
        }
        renderCard={(r) => {
          const winnerPlayer = r.players?.find(p => p.userId === r.winner_id);
          return (
            <div className="space-y-3">
              {/* Date + winner */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(r.played_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}{' '}
                  {new Date(r.played_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-brand-gold" />
                  <span className="font-black text-white text-xs">{winnerPlayer?.nickname || '—'}</span>
                </div>
              </div>
              {/* Players */}
              <div className="flex flex-wrap gap-1.5">
                {r.players?.map(p => (
                  <span key={p.userId} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    p.userId === r.winner_id
                      ? 'bg-amber-500/10 text-brand-gold border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}>
                    {p.nickname}
                  </span>
                ))}
              </div>
              {/* Pot + rake + CTA */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex gap-4 text-xs">
                  <span className="text-slate-400">Bote: <span className="font-black text-white">{formatCurrency(r.total_pot)}</span></span>
                  <span className="text-slate-400">Rake: <span className="font-black text-emerald-400">{formatCurrency(r.total_rake)}</span></span>
                </div>
                <Link
                  href={`/admin/replays/${r.game_id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <Eye className="w-3 h-3" />
                  Ver
                </Link>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
