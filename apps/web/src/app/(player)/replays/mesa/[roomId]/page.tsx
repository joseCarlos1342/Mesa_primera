import { getPlayerReplaysForRoom } from "@/app/actions/replays";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { Film, Trophy, TrendingDown, Users, Clock } from "lucide-react";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function MesaDetailPage({ params }: Props) {
  const { roomId } = await params;
  const replays = await getPlayerReplaysForRoom(roomId);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-(--accent-gold) flex items-center justify-center md:justify-start gap-3 drop-shadow-[0_4px_12px_rgba(234,179,8,0.2)]">
          <Film className="w-8 h-8 md:w-10 md:h-10" />
          GRABACIONES DE MESA
        </h1>
        <p className="text-slate-300 font-medium mt-2 text-sm md:text-base bg-black/30 inline-block px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
          <span className="text-(--accent-gold) font-bold">{replays.length}</span> {replays.length === 1 ? 'partida' : 'partidas'} en la mesa <span className="font-mono text-(--accent-gold)/70 pl-1">{roomId.substring(0, 8)}</span>
        </p>
      </div>

      {/* Replays List */}
      {replays.length === 0 ? (
        <div className="text-center py-24 bg-black/20 rounded-4xl border border-white/5 backdrop-blur-md">
          <Film className="w-20 h-20 text-(--accent-gold)/40 mx-auto mb-6" />
          <p className="text-white font-bold text-xl">No se encontraron grabaciones</p>
          <p className="text-slate-400 text-sm mt-2">Aún no existen repeticiones disponibles para esta mesa.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {replays.map((r) => {
            const playerNames = r.players?.map((p) => p.nickname).filter(Boolean) || [];
            const resultColorClass = r.is_winner 
              ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
              : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]';
            
            const cardBorderClass = r.is_winner
              ? 'border-emerald-500/30 shadow-[0_4px_24px_-8px_rgba(16,185,129,0.15)]'
              : 'border-red-500/30 shadow-[0_4px_24px_-8px_rgba(239,68,68,0.15)]';

            const badgeBg = r.is_winner ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20';

            return (
              <Link
                key={r.game_id}
                href={`/replays/${r.game_id}`}
                className={`group block bg-black/40 border ${cardBorderClass} rounded-3xl p-5 hover:-translate-y-1 transition-all duration-300 backdrop-blur-md relative overflow-hidden`}
              >
                {/* Result Accent Line */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${r.is_winner ? 'bg-linear-to-r from-emerald-500/50 to-emerald-400' : 'bg-linear-to-r from-red-500/50 to-red-400'}`} />

                <div className="flex flex-col h-full justify-between gap-5 mt-1">
                  
                  {/* Top: Status & Date */}
                  <div className="flex justify-between items-start">
                    <div className={`px-3 py-1 flex items-center gap-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${badgeBg}`}>
                      {r.is_winner ? <Trophy className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {r.is_winner ? 'Victoria' : 'Derrota'}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-(--accent-gold) uppercase tracking-widest flex items-center justify-end gap-1 mb-0.5">
                        <Clock className="w-3 h-3" /> Fecha
                      </p>
                      <p className="text-xs text-white/80 font-medium">
                        {new Date(r.played_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(r.played_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Players */}
                  {playerNames.length > 0 && (
                    <div className="py-3 border-y border-white/5">
                      <p className="text-[10px] font-black text-(--accent-gold) uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Jugadores contra ti
                      </p>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-2">
                        {playerNames.join(' • ')}
                      </p>
                    </div>
                  )}

                  {/* Bottom: Financial Result */}
                  <div className="flex items-end justify-between pt-1">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Bote total
                      </p>
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(r.total_pot)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${r.is_winner ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                        Resultado Neto
                      </p>
                      <span className={`text-2xl font-black ${resultColorClass}`}>
                        {r.net_result > 0 ? '+' : ''}{formatCurrency(r.net_result)}
                      </span>
                    </div>
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
