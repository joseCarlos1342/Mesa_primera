import { getPlayerMesaReplays } from "@/app/actions/replays";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { Film, Users, ArrowLeft, Clock, ChevronRight, Hash } from "lucide-react";

export default async function PlayerReplaysPage() {
  const mesas = await getPlayerMesaReplays(100);

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
          MIS GRABACIONES
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Historial de mesas jugadas ({mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'})
        </p>
      </div>

      {/* Mesa List Table */}
      {mesas.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">Aún no tienes partidas registradas</p>
          <p className="text-slate-600 text-sm mt-1">Juega una partida y aparecerá aquí.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-3 text-xs font-black text-slate-500 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3 h-3" />
                    Mesa
                  </div>
                </th>
                <th className="pb-3 text-xs font-black text-slate-500 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Fecha / Hora
                  </div>
                </th>
                <th className="pb-3 text-xs font-black text-slate-500 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    Jugadores
                  </div>
                </th>
                <th className="pb-3 text-xs font-black text-slate-500 uppercase tracking-widest text-center">
                  Partidas
                </th>
                <th className="pb-3 text-xs font-black text-slate-500 uppercase tracking-widest text-right">
                  Resultado
                </th>
                <th className="pb-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {mesas.map((mesa) => {
                const playerNames = mesa.players
                  ?.map((p: any) => p.nickname)
                  .filter(Boolean) || [];

                return (
                  <tr key={mesa.room_id} className="group border-b border-white/5 last:border-0">
                    <td className="py-4">
                      <Link
                        href={`/replays/mesa/${encodeURIComponent(mesa.room_id)}`}
                        className="flex items-center gap-2 hover:text-(--accent-gold) transition-colors"
                      >
                        <span className="font-black text-white group-hover:text-(--accent-gold) transition-colors">
                          {mesa.table_name || 'Mesa'}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {mesa.room_id.substring(0, 8)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-slate-300">
                        {new Date(mesa.last_played_at).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {new Date(mesa.first_played_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                        {' — '}
                        {new Date(mesa.last_played_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-[12px] text-slate-400 max-w-50 truncate">
                        {playerNames.length > 0 ? playerNames.join(', ') : '—'}
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-lg bg-white/5 text-sm font-black text-slate-300">
                        {mesa.game_count}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className={`text-lg font-black ${
                        mesa.total_net_result > 0 ? 'text-emerald-400' :
                        mesa.total_net_result < 0 ? 'text-red-400' :
                        'text-slate-400'
                      }`}>
                        {mesa.total_net_result > 0 ? '+' : ''}{formatCurrency(mesa.total_net_result)}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/replays/mesa/${encodeURIComponent(mesa.room_id)}`}
                        className="text-slate-600 group-hover:text-(--accent-gold) transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
