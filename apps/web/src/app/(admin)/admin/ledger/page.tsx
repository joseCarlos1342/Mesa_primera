import { getLedgerEntries } from "@/app/actions/admin-ledger";
import { BookOpen, Search, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/utils/format";

export default async function AdminLedgerPage() {
  const entries = await getLedgerEntries(50); // Fetch last 50 for initial view

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
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
        <div className="relative w-full md:w-64">
           {/* Para versión final: componente de filtrado por usuario/ID de mesa */}
           <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
             <Search className="w-4 h-4 text-slate-500" />
           </div>
           <input type="text" placeholder="Buscar por referencia o usuario..." className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" disabled />
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl mt-8">
         <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Últimas 50 transacciones
            </h3>
            <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                EXPORTAR CSV
            </button>
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
