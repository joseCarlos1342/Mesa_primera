import { Users, ShieldAlert, Smartphone, Clock, Ban } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { UserBanControl } from "@/components/admin/UserBanControl";
import { UserBalanceControl } from "@/components/admin/UserBalanceControl";
import { UserSearch } from "@/components/admin/UserSearch";
import { getUsersList } from "@/app/actions/admin-users";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminUsersPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === 'string' ? searchParams.q.toLowerCase() : '';

  let users = await getUsersList();

  // Basic fraud detection: mark users sharing device footprints
  const deviceCounts = new Map<string, number>();
  users.forEach(u => {
     u.devices?.forEach(d => {
       if (d.fingerprint) {
         deviceCounts.set(d.fingerprint, (deviceCounts.get(d.fingerprint) || 0) + 1);
       }
     });
  });

  if (q === 'fraud') {
    users = users.filter(u => u.devices?.some(d => (deviceCounts.get(d.fingerprint) || 0) > 1));
  } else if (q) {
    users = users.filter(u => 
      u.display_name.toLowerCase().includes(q) || 
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  }

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <div className="pb-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
            <Users className="w-10 h-10 text-emerald-400" />
            DIRECTORIO DE USUARIOS
            </h1>
            <p className="text-slate-500 font-medium mt-2">
            Gestión de jugadores, historial y control de fraude.
            </p>
        </div>
        <div className="relative w-full md:w-64">
           <UserSearch />
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
               <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest">
                  <tr>
                     <th className="px-6 py-4">Usuario</th>
                     <th className="px-6 py-4">Status & Contacto</th>
                     <th className="px-6 py-4 shadow-inner">Bóveda</th>
                     <th className="px-6 py-4">Actividad</th>
                     <th className="px-6 py-4 text-right">Moderación</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {users.map(user => {
                     // Check if any device matches multiple accounts
                     const sharesDevice = user.devices?.some(d => (deviceCounts.get(d.fingerprint) || 0) > 1);
                     
                     return (
                     <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.is_banned ? 'bg-red-950/10' : ''}`}>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${
                                user.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-800'
                              }`}>
                                {user.display_name.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                 <p className="font-bold text-white group-hover:text-indigo-400 flex items-center gap-2">
                                     {user.display_name} 
                                     {user.role === 'admin' && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded font-black">ADMIN</span>}
                                 </p>
                                 <p className="text-xs font-mono text-slate-500 mt-0.5">{user.id.substring(0,8)}...</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           {user.is_banned ? (
                              <div className="flex flex-col gap-1">
                                  <span className="text-xs font-bold text-red-500 flex items-center gap-1"><Ban className="w-3 h-3" /> BANEADO</span>
                                  <span className="text-[10px] text-red-400/70 truncate max-w-[150px]" title={user.ban_reason || ""}>"{user.ban_reason}"</span>
                              </div>
                           ) : (
                              <div className="flex flex-col gap-1">
                                  <span className="text-sm font-semibold text-white/90">{user.username}</span>
                                  <span className="text-xs font-mono text-slate-400">{user.phone}</span>
                                  {sharesDevice && (
                                     <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                                         <Smartphone className="w-3 h-3" /> Multi-cuenta sospechosa
                                     </span>
                                  )}
                              </div>
                           )}
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-400">
                           {formatCurrency(user.balance_cents)}
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-1">
                               <p className="text-xs text-slate-300">Jugadas: <span className="font-bold">{user.stats?.games_played || 0}</span></p>
                               <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Último login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
                               </p>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-4 items-center">
                              {user.role !== 'admin' && (
                                 <>
                                    <UserBalanceControl userId={user.id} userName={user.display_name} currentBalance={user.balance_cents} />
                                    <div className="w-px h-4 bg-white/10" />
                                    <UserBanControl userId={user.id} isBanned={user.is_banned} userName={user.display_name} />
                                 </>
                              )}
                           </div>
                        </td>
                     </tr>
                  )})}
                  
                  {users.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                           No hay usuarios registrados.
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
