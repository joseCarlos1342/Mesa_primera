import { getPlayerMesaReplays } from "@/app/actions/replays";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { Film, Users, Clock, ChevronRight, Hash } from "lucide-react";

export default async function PlayerReplaysPage() {
  const mesas = await getPlayerMesaReplays(100);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-(--accent-gold) flex items-center gap-3">
          <Film className="w-8 h-8" />
          MIS GRABACIONES
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Historial de mesas jugadas ({mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'})
        </p>
      </div>

      {/* Mesa List */}
      {mesas.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-16 h-16 text-[var(--accent-gold)]/50 mx-auto mb-4" />
          <p className="text-[var(--accent-gold)] font-bold text-lg">Aún no tienes partidas registradas</p>
          <p className="text-slate-400 text-sm mt-1">Juega una partida y aparecerá aquí.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto bg-black/20 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pb-4 pt-2 text-xs font-black text-[var(--accent-gold)] uppercase tracking-widest pl-4">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Mesa
                    </div>
                  </th>
                  <th className="pb-4 pt-2 text-xs font-black text-[var(--accent-gold)] uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Fecha / Hora
                    </div>
                  </th>
                  <th className="pb-4 pt-2 text-xs font-black text-[var(--accent-gold)] uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Jugadores
                    </div>
                  </th>
                  <th className="pb-4 pt-2 text-xs font-black text-[var(--accent-gold)] uppercase tracking-widest text-center">
                    Partidas
                  </th>
                  <th className="pb-4 pt-2 text-xs font-black text-[var(--accent-gold)] uppercase tracking-widest text-right pr-4">
                    Resultado
                  </th>
                  <th className="pb-4 pt-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {mesas.map((mesa) => {
                  const playerNames = mesa.players
                    ?.map((p: any) => p.nickname)
                    .filter(Boolean) || [];

                  return (
                    <tr key={mesa.room_id} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-5 pl-4">
                        <Link
                          href={`/replays/mesa/${encodeURIComponent(mesa.room_id)}`}
                          className="flex flex-col gap-1"
                        >
                          <span className="font-black text-lg text-white group-hover:text-[var(--accent-gold)] transition-colors">
                            {mesa.table_name || 'Mesa'}
                          </span>
                          <span className="text-[11px] text-[var(--accent-gold)]/60 font-mono tracking-widest">
                            {mesa.room_id.substring(0, 8)}
                          </span>
                        </Link>
                      </td>
                      <td className="py-5">
                        <div className="text-sm font-bold text-white mb-1">
                          {new Date(mesa.last_played_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {new Date(mesa.first_played_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                          {' — '}
                          {new Date(mesa.last_played_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="text-xs text-slate-300 max-w-xs truncate font-medium">
                          {playerNames.length > 0 ? playerNames.join(', ') : '—'}
                        </div>
                      </td>
                      <td className="py-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-3 rounded-xl bg-black/40 border border-white/10 text-sm font-black text-[var(--accent-gold)]">
                          {mesa.game_count}
                        </span>
                      </td>
                      <td className="py-5 text-right pr-4">
                        <span className={`text-xl font-black ${
                          mesa.total_net_result > 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' :
                          mesa.total_net_result < 0 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]' :
                          'text-slate-400'
                        }`}>
                          {mesa.total_net_result > 0 ? '+' : ''}{formatCurrency(mesa.total_net_result)}
                        </span>
                      </td>
                      <td className="py-5 pr-2">
                        <Link
                          href={`/replays/mesa/${encodeURIComponent(mesa.room_id)}`}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-[var(--text-secondary)] group-hover:bg-[var(--accent-gold)] group-hover:text-black transition-all"
                        >
                          <ChevronRight className="w-5 h-5 ml-0.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-4">
            {mesas.map((mesa) => {
              const playerNames = mesa.players
                ?.map((p: any) => p.nickname)
                .filter(Boolean) || [];

              return (
                <Link
                  key={mesa.room_id}
                  href={`/replays/mesa/${encodeURIComponent(mesa.room_id)}`}
                  className="bg-black/20 border border-[var(--accent-gold)]/20 rounded-[2rem] p-5 backdrop-blur-md active:scale-[0.98] transition-transform flex flex-col relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="font-black text-xl text-white flex items-center gap-2">
                        <Hash className="w-5 h-5 text-[var(--accent-gold)]" />
                        {mesa.table_name || 'Mesa'}
                      </h2>
                      <p className="text-[10px] text-[var(--accent-gold)]/60 font-mono tracking-widest mt-1">
                        {mesa.room_id.substring(0, 8)}
                      </p>
                    </div>
                    <span className={`text-xl font-black ${
                      mesa.total_net_result > 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' :
                      mesa.total_net_result < 0 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]' :
                      'text-slate-400'
                    }`}>
                      {mesa.total_net_result > 0 ? '+' : ''}{formatCurrency(mesa.total_net_result)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
                    <div>
                      <p className="text-[10px] font-black text-[var(--accent-gold)] uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Fecha
                      </p>
                      <p className="text-white font-bold">
                        {new Date(mesa.last_played_at).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short'
                        })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(mesa.first_played_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {new Date(mesa.last_played_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[var(--accent-gold)] uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Film className="w-3 h-3" /> Partidas
                      </p>
                      <p className="text-white font-bold">{mesa.game_count} jugadas</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--accent-gold)]/10">
                    <p className="text-[10px] font-black text-[var(--accent-gold)] uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Jugadores
                    </p>
                    <p className="text-xs text-slate-300 font-medium truncate">
                      {playerNames.length > 0 ? playerNames.join(', ') : '—'}
                    </p>
                  </div>

                  {/* Arrow overlay */}
                  <div className="absolute right-4 bottom-4 w-8 h-8 rounded-full bg-[var(--accent-gold)]/10 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-[var(--accent-gold)]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
