import { getActiveGames, getTablesList, deleteTable, getTableFinancials } from "@/app/actions/admin-tables";
import { Gamepad2, AlertCircle, Play, Pause, Trash2, Settings2, Users as UsersIcon, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { TableControls } from "@/components/admin/TableControls";
import { PlayerControls } from "@/components/admin/PlayerControls";
import { CreateTableModal } from "@/components/admin/CreateTableModal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTablesPage() {
  let games: Awaited<ReturnType<typeof getActiveGames>> = [];
  let tables: Awaited<ReturnType<typeof getTablesList>> = [];
  let financials: Awaited<ReturnType<typeof getTableFinancials>> = [];

  try {
    [games, tables, financials] = await Promise.all([
      getActiveGames(),
      getTablesList(),
      getTableFinancials()
    ]);
  } catch (err: any) {
    console.error("[AdminTablesPage] Error cargando datos:", err);
  }

  return (
    <div className="min-h-full space-y-12 animate-in fade-in duration-700">
      <div className="pb-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
            <Gamepad2 className="w-12 h-12 text-emerald-400" />
            CONTROL DE MESAS
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Supervisión técnica de salas (En Vivo) y gestión de configuraciones del local.
          </p>
        </div>
        <CreateTableModal />
      </div>

      {/* 🚀 SECTION 1: ACTIVE ROOMS (EN VIVO) */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Salas en Vivo</h2>
           <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black">{games.length} ACTIVAS</span>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {games.map((game) => (
            <div key={game.id} className="backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col group/room hover:border-white/20 transition-all">
              <div className={`px-6 py-5 flex justify-between items-center border-b border-white/5 ${
                game.status === 'playing' ? 'bg-emerald-500/10' :
                game.status === 'paused' ? 'bg-amber-500/10' :
                'bg-slate-800/50'
              }`}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">ROOM ID: {game.id.split('-')[0]}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black flex items-center gap-2 ${
                      game.status === 'playing' ? 'text-emerald-400' :
                      game.status === 'paused' ? 'text-amber-400' :
                      'text-slate-400'
                    }`}>
                      {game.status === 'playing' ? <Play className="w-4 h-4 fill-current" /> :
                      game.status === 'paused' ? <Pause className="w-4 h-4 fill-current" /> :
                      <AlertCircle className="w-4 h-4" />}
                      {game.status.toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-white tracking-tight">{game.name}</span>
                  </div>
                </div>
                
                <TableControls gameId={game.id} currentStatus={game.status} />
              </div>

              <div className="p-8 flex-1 flex flex-col gap-8">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pote Principal</p>
                       <p className="text-2xl font-black text-white">{formatCurrency(game.main_pot_cents)}</p>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pote Pique</p>
                       <p className="text-2xl font-black text-emerald-400">{formatCurrency(game.pique_pot_cents)}</p>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Mínimo Bet</p>
                       <p className="text-2xl font-black text-slate-300">{formatCurrency(game.min_bet_cents)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2 flex justify-between items-center">
                      <span className="flex items-center gap-2"><UsersIcon className="w-3 h-3" /> Jugadores ({game.players.length}/{game.max_players})</span>
                      <span className="text-red-500/70 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> CEGUERA ADMIN ACTIVA</span>
                    </h4>
                    <div className="space-y-3">
                      {game.players.map((p) => (
                        <div key={p.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center group/player hover:bg-white/10 transition-colors shadow-sm">
                          <div>
                            <p className="text-sm font-black text-white flex items-center gap-3">
                               <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-white/10">#{p.seat_number}</span>
                               {p.display_name}
                               <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase font-black">
                                 {p.status}
                               </span>
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-2 flex items-center gap-2">
                               <span className="w-1 h-1 rounded-full bg-slate-600" /> Apuesta: {formatCurrency(p.bet_current_cents)}
                            </p>
                          </div>
                          <PlayerControls gameId={game.id} playerId={p.id} />
                        </div>
                      ))}
                      {game.players.length === 0 && (
                        <div className="text-center py-6 text-sm font-bold text-slate-500 bg-black/30 rounded-2xl border border-dashed border-white/10 italic">
                           Mesa libre... esperando jugadores
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          ))}

          {games.length === 0 && (
            <div className="col-span-full border border-dashed border-white/20 rounded-[3rem] p-16 text-center text-slate-500 backdrop-blur-md bg-white/5">
               <Gamepad2 className="w-20 h-20 mx-auto mb-6 opacity-20 text-emerald-400" />
               <h3 className="text-2xl font-black mb-2 text-white italic tracking-tight">SIN ACCIÓN EN VIVO</h3>
               <p className="text-sm font-medium">Buscando actividad en el servidor US-EAST-1...</p>
            </div>
          )}
        </div>
      </section>

      {/* 💰 SECTION 2: TABLE FINANCIALS (AUDITORÍA) */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-2">
           <BarChart3 className="w-5 h-5 text-amber-400" />
           <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Auditoría Financiera por Mesa</h2>
           <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black">{financials.length} MESAS</span>
        </div>

        {financials.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-[2.5rem] p-12 text-center text-slate-500 bg-white/5 backdrop-blur-md">
             <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20 text-amber-400" />
             <p className="text-sm font-bold">No hay registros financieros aún.</p>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                   <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-500 font-black tracking-[0.2em] border-b border-white/5">
                      <tr>
                         <th className="px-6 py-5">Mesa</th>
                         <th className="px-6 py-5 text-center">Partidas</th>
                         <th className="px-6 py-5 text-center">Jugadores</th>
                         <th className="px-6 py-5 text-right">Total Apostado</th>
                         <th className="px-6 py-5 text-right">Premios</th>
                         <th className="px-6 py-5 text-right">
                           <span className="flex items-center justify-end gap-1">
                             <TrendingUp className="w-3 h-3 text-emerald-400" />
                             Rake Casa
                           </span>
                         </th>
                         <th className="px-6 py-5 text-right">Última Actividad</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {financials.map(f => (
                         <tr key={f.table_id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                     <DollarSign className="w-4 h-4 text-amber-400" />
                                  </div>
                                  <div>
                                     <p className="font-black text-white text-sm tracking-tight">{f.table_name}</p>
                                     <p className="text-[10px] font-mono text-slate-500 uppercase">{f.game_type}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                               <span className="bg-slate-800 text-white text-xs font-black px-3 py-1 rounded-full border border-white/10">
                                 {f.total_games}
                               </span>
                            </td>
                            <td className="px-6 py-5 text-center">
                               <span className="text-sm font-bold text-slate-300">{f.unique_players}</span>
                            </td>
                            <td className="px-6 py-5 text-right font-black text-slate-300 text-sm">
                               {formatCurrency(f.total_bets_cents)}
                            </td>
                            <td className="px-6 py-5 text-right font-black text-white text-sm">
                               {formatCurrency(f.total_winnings_cents)}
                            </td>
                            <td className="px-6 py-5 text-right">
                               <span className="font-black text-emerald-400 text-base">
                                 {formatCurrency(f.total_rake_cents)}
                               </span>
                            </td>
                            <td className="px-6 py-5 text-right text-xs text-slate-500">
                               {f.last_activity
                                 ? new Date(f.last_activity).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                 : 'Sin actividad'}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </section>

      {/* ⚙️ SECTION 3: TABLE TEMPLATES (CONFIGURACIONES) */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-2">
           <Settings2 className="w-5 h-5 text-indigo-400" />
           <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Gestión de Mesas</h2>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                 <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-500 font-black tracking-[0.2em] border-b border-white/5">
                    <tr>
                       <th className="px-8 py-5">Identificador</th>
                       <th className="px-8 py-5">Tipo de Juego</th>
                       <th className="px-8 py-5">Capacidad</th>
                       <th className="px-8 py-5">Mínimo Bet</th>
                       <th className="px-8 py-5 text-right">Mantenimiento</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {tables.map(table => (
                       <tr key={table.id} className="hover:bg-white/5 transition-colors group/row">
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                   <Gamepad2 className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                   <p className="font-black text-white text-base tracking-tight">{table.name}</p>
                                   <p className="text-[10px] font-mono text-slate-500 uppercase">{table.id.substring(0,8)}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <span className="bg-slate-800 text-slate-300 text-[10px] font-black px-2 py-1 rounded border border-white/5 uppercase">
                                {table.game_type}
                             </span>
                          </td>
                          <td className="px-8 py-5 font-bold text-slate-300">
                             {table.max_players} Jugadores
                          </td>
                          <td className="px-8 py-5 font-black text-emerald-400 text-base">
                             {formatCurrency(table.min_bet)}
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className="flex justify-end gap-3 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                <button
                                  className="p-3 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                                  title="Editar (Próximamente)"
                                >
                                   <Settings2 className="w-5 h-5" />
                                </button>
                                <form action={async () => { "use server"; await deleteTable(table.id); }}>
                                  <button
                                    type="submit"
                                    className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                                    onClick={(e) => { if(!confirm("¿Eliminar configuración de mesa?")) e.preventDefault(); }}
                                  >
                                     <Trash2 className="w-5 h-5" />
                                  </button>
                                </form>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </section>
    </div>
  );
}
