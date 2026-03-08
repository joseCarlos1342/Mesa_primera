import { getActiveGames } from "@/app/actions/admin-tables";
import { Gamepad2, AlertCircle, Play, Pause } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { TableControls } from "@/components/admin/TableControls";
import { PlayerControls } from "@/components/admin/PlayerControls";

export default async function AdminTablesPage() {
  const games = await getActiveGames();

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <div className="pb-6 border-b border-white/5">
        <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
          <Gamepad2 className="w-10 h-10 text-emerald-400" />
          CONTROL DE MESAS
        </h1>
        <p className="text-slate-500 font-medium mt-2">
          Monitoreo en vivo de salas activas. Pausa, cierra o expulsa jugadores si es necesario.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {games.map((game) => (
          <div key={game.id} className="backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
            <div className={`px-6 py-4 flex justify-between items-center border-b border-white/5 ${
              game.status === 'playing' ? 'bg-emerald-500/10' :
              game.status === 'paused' ? 'bg-amber-500/10' :
              'bg-slate-800/50'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">MESA ID: {game.id.split('-')[0]}</span>
                <span className={`text-sm font-bold flex items-center gap-2 ${
                  game.status === 'playing' ? 'text-emerald-400' :
                  game.status === 'paused' ? 'text-amber-400' :
                  'text-slate-400'
                }`}>
                  {game.status === 'playing' ? <Play className="w-4 h-4 fill-current" /> :
                   game.status === 'paused' ? <Pause className="w-4 h-4 fill-current" /> :
                   <AlertCircle className="w-4 h-4" />}
                   
                  ESTADO: {game.status.toUpperCase()}
                </span>
              </div>
              
              <TableControls gameId={game.id} currentStatus={game.status} />
              
            </div>

            <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pote Principal</p>
                     <p className="text-xl font-black text-white">{formatCurrency(game.main_pot_cents)}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pote Pique</p>
                     <p className="text-xl font-black text-emerald-400">{formatCurrency(game.pique_pot_cents)}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Apuesta Min</p>
                     <p className="text-xl font-black text-slate-300">{formatCurrency(game.min_bet_cents)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 ml-2 flex justify-between">
                    <span>Jugadores ({game.players.length}/{game.max_players})</span>
                    <span className="text-red-400">NO SE MUESTRAN CARTAS (CEGUERA)</span>
                  </h4>
                  <div className="space-y-2">
                    {game.players.map((p) => (
                      <div key={p.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center group hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                             SEAT {p.seat_number} - {p.display_name}
                             <span className="text-xs px-2 py-0.5 rounded flex items-center justify-center bg-slate-800 text-slate-300 font-medium">
                               {p.status}
                             </span>
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-1">Apuesta Actual: {formatCurrency(p.bet_current_cents)}</p>
                        </div>
                        <PlayerControls gameId={game.id} playerId={p.id} />
                      </div>
                    ))}
                    {game.players.length === 0 && (
                      <div className="text-center py-4 text-sm font-medium text-slate-500 bg-black/20 rounded-xl border border-white/5">
                         Mesa vacía
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        ))}

        {games.length === 0 && (
          <div className="col-span-full border border-dashed border-white/10 rounded-[2rem] p-12 text-center text-slate-500 backdrop-blur-sm">
             <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
             <h3 className="text-xl font-bold mb-2 text-white">No hay mesas activas</h3>
             <p className="text-sm">Actualmente nadie está jugando o esperando partidas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
