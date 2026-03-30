import { getPlayerReplays } from "@/app/actions/replays";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { Film, Trophy, TrendingDown, Users, ArrowLeft, Clock } from "lucide-react";

export default async function PlayerReplaysPage() {
  const replays = await getPlayerReplays(100);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lobby"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Lobby
        </Link>
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-(--accent-gold) flex items-center gap-3">
          <Film className="w-8 h-8" />
          MIS REPETICIONES
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Historial de partidas jugadas ({replays.length} registros)
        </p>
      </div>

      {/* Replays List */}
      {replays.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">Aún no tienes partidas registradas</p>
          <p className="text-slate-600 text-sm mt-1">Juega una partida y aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {replays.map((r) => {
            const playerNames = r.players?.map(p => p.nickname).filter(Boolean) || [];

            return (
              <Link
                key={r.game_id}
                href={`/replays/${r.game_id}`}
                className="group block bg-(--bg-card) border border-(--border-glow) rounded-2xl p-5 hover:border-(--accent-gold)/30 transition-all hover:bg-white/5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Date + Players */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      r.is_winner
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}>
                      {r.is_winner
                        ? <Trophy className="w-5 h-5 text-emerald-400" />
                        : <TrendingDown className="w-5 h-5 text-red-400" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          r.is_winner
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {r.is_winner ? 'Victoria' : 'Derrota'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(r.played_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                          {' · '}
                          {new Date(r.played_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {playerNames.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Users className="w-3 h-3 text-slate-600" />
                          <span className="text-[11px] text-slate-500">
                            {playerNames.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Financial result */}
                  <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                    <span className={`text-2xl font-black ${
                      r.net_result > 0 ? 'text-emerald-400' :
                      r.net_result < 0 ? 'text-red-400' :
                      'text-slate-400'
                    }`}>
                      {r.net_result > 0 ? '+' : ''}{formatCurrency(r.net_result)}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                      Bote: {formatCurrency(r.total_pot)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
