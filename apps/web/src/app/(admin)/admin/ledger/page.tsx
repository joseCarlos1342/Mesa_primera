import { getLedgerEntries, getUsersWithBalances } from "@/app/actions/admin-ledger";
import { BookOpen, ArrowUpRight, ArrowDownLeft, ShieldCheck, Users, Eye, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { LedgerRealtimeRefresh } from "@/components/admin/LedgerRealtimeRefresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLedgerPage() {
  let entries: Awaited<ReturnType<typeof getLedgerEntries>> = [];
  let users: Awaited<ReturnType<typeof getUsersWithBalances>> = [];
  let loadError: string | null = null;

  try {
    [entries, users] = await Promise.all([
      getLedgerEntries(50),
      getUsersWithBalances()
    ]);
  } catch (err: any) {
    console.error("[AdminLedgerPage] Error cargando datos:", err);
    loadError = err?.message || "Error desconocido al cargar el ledger";
  }

  if (loadError) {
    return (
      <div className="min-h-full flex items-center justify-center animate-in fade-in duration-700">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-10 max-w-lg text-center">
          <BookOpen className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-400 mb-2">Error al cargar el Ledger</h2>
          <p className="text-slate-400 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <LedgerRealtimeRefresh />
      <div className="pb-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
            <BookOpen className="w-10 h-10 text-emerald-400" />
            LIBRO MAYOR (LEDGER)
            </h1>
            <p className="text-slate-500 font-medium mt-2">
            Registro de auditoría inmutable de todas las transacciones de fichas.
            </p>
        </div>
      </div>

      {/* Users Summary Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Users className="w-5 h-5 text-emerald-400" />
            Jugadores Registrados
            <span className="text-sm font-bold text-slate-500 ml-2">({users.length})</span>
          </h2>
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
              Total en Sistema: {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Jugador</th>
                  <th className="px-6 py-4 text-right">Saldo Actual</th>
                  <th className="px-6 py-4 text-right">Total Créditos</th>
                  <th className="px-6 py-4 text-right">Total Débitos</th>
                  <th className="px-6 py-4">Última Actividad</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{user.display_name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{user.id.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-black text-lg ${user.balance > 0 ? 'text-emerald-400' : user.balance < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {formatCurrency(user.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">
                      +{formatCurrency(user.total_credits)}
                    </td>
                    <td className="px-6 py-4 text-right text-red-400 font-bold">
                      -{formatCurrency(user.total_debits)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {user.last_activity ? new Date(user.last_activity).toLocaleString('es-ES') : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/ledger/${user.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 border border-indigo-500/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Desglose
                      </Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Global Ledger */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl mt-8">
         <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Últimas 50 transacciones globales
            </h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
               <thead className="text-xs uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-white/5">
                  <tr>
                     <th className="px-6 py-4">Fecha</th>
                     <th className="px-6 py-4">Tipo & Status</th>
                     <th className="px-6 py-4">Usuario</th>
                     <th className="px-6 py-4 text-right">Monto</th>
                     <th className="px-6 py-4 text-right">Balance Resultante</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {entries.map(entry => (
                     <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">
                           {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-1">
                               <p className="font-bold flex items-center gap-2 text-white">
                                  {entry.direction === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                                  {entry.type.toUpperCase().replace(/_/g, ' ')}
                               </p>
                               <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded w-max ${
                                 entry.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                                 entry.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : 
                                 'bg-red-500/20 text-red-500'
                               }`}>
                                 {entry.status}
                               </span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           {entry.user_id ? (
                               <div className="flex flex-col">
                                   <span className="font-bold text-white">{entry.user?.display_name || "Desconocido"}</span>
                                   <span className="text-[10px] font-mono text-slate-500">{entry.user_id.substring(0,8)}...</span>
                               </div>
                           ) : (
                               <span className="text-xs text-slate-500 italic">SISTEMA / BÓVEDA</span>
                           )}
                        </td>
                        <td className={`px-6 py-4 text-right font-black ${entry.direction === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                           {entry.direction === 'credit' ? '+' : '-'}{formatCurrency(entry.amount_cents)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                           {formatCurrency(entry.balance_after_cents)}
                        </td>
                     </tr>
                  ))}
                  
                  {entries.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                           No hay registros en el libro mayor.
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
