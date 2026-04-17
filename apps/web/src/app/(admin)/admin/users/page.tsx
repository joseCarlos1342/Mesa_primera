import { Users, Smartphone, Clock, Ban } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { UserBanControl } from "@/components/admin/UserBanControl";
import { UserBalanceControl } from "@/components/admin/UserBalanceControl";
import { UserSearch } from "@/components/admin/UserSearch";
import { getUsersList } from "@/app/actions/admin-users";
import { ResponsiveDataView, type ColumnDef } from "@/components/admin/ResponsiveDataView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

type UserRow = Awaited<ReturnType<typeof getUsersList>>[number] & { sharesDevice: boolean };

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

  const rows: UserRow[] = users.map(u => ({
    ...u,
    sharesDevice: u.devices?.some(d => (deviceCounts.get(d.fingerprint) || 0) > 1) ?? false,
  }));

  const columns: ColumnDef<UserRow>[] = [
    {
      key: "user",
      header: "Usuario",
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner shrink-0 ${
            user.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-800'
          }`}>
            {user.display_name.substring(0,2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white flex items-center gap-2 flex-wrap">
              {user.display_name}
              {user.role === 'admin' && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded font-black">ADMIN</span>}
            </p>
            <p className="text-xs font-mono text-slate-500 mt-0.5 break-all">{user.id.substring(0,8)}...</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status & Contacto",
      render: (user) =>
        user.is_banned ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-red-500 flex items-center gap-1"><Ban className="w-3 h-3" /> BANEADO</span>
            <span className="text-[10px] text-red-400/70 break-words" title={user.ban_reason || ""}>"{user.ban_reason}"</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-white/90">{user.username}</span>
            <span className="text-xs font-mono text-slate-400">{user.phone}</span>
            {user.sharesDevice && (
              <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                <Smartphone className="w-3 h-3" /> Multi-cuenta sospechosa
              </span>
            )}
          </div>
        ),
    },
    {
      key: "balance",
      header: "Bóveda",
      align: "center",
      render: (user) => (
        <span className="font-black text-emerald-400 whitespace-nowrap">{formatCurrency(user.balance_cents)}</span>
      ),
    },
    {
      key: "activity",
      header: "Actividad",
      render: (user) => (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate-300">Jugadas: <span className="font-bold">{user.stats?.games_played || 0}</span></p>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Último login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      ),
    },
    {
      key: "moderation",
      header: "Moderación",
      align: "right",
      cardFullWidth: true,
      render: (user) => (
        <div className="flex justify-end gap-4 items-center">
          {user.role !== 'admin' && (
            <>
              <UserBalanceControl userId={user.id} userName={user.display_name} currentBalance={user.balance_cents} />
              <div className="w-px h-4 bg-white/10" />
              <UserBanControl userId={user.id} isBanned={user.is_banned} userName={user.display_name} />
            </>
          )}
        </div>
      ),
    },
  ];

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

      <ResponsiveDataView
        columns={columns}
        data={rows}
        keyExtractor={(user) => user.id}
        emptyMessage="No hay usuarios registrados."
        rowClassName={(user) => user.is_banned ? 'bg-red-950/10' : ''}
        cardClassName={() => "mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] first:mt-3 last:mb-3"}
        renderCard={(user) => (
          <div className="space-y-3">
            {/* Header: avatar + name */}
            <div className="flex items-start gap-3 border-b border-white/5 pb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner shrink-0 ${
                user.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-800'
              }`}>
                {user.display_name.substring(0,2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white flex items-center gap-2 flex-wrap">
                  {user.display_name}
                  {user.role === 'admin' && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded font-black">ADMIN</span>}
                </p>
                <p className="text-xs font-mono text-slate-500 truncate">{user.id.substring(0,8)}...</p>
              </div>
              <span className="font-black text-emerald-400 text-lg whitespace-nowrap">{formatCurrency(user.balance_cents)}</span>
            </div>
            {/* Status & contact */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Status</p>
                {user.is_banned ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1"><Ban className="w-3 h-3" /> BANEADO</span>
                    <span className="text-[10px] text-red-400/70 break-words">"{user.ban_reason}"</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-white/90">{user.username}</span>
                    <span className="text-xs font-mono text-slate-400">{user.phone}</span>
                    {user.sharesDevice && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded flex items-center gap-1 w-max mt-1">
                        <Smartphone className="w-3 h-3" /> Multi-cuenta
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Actividad</p>
                <p className="text-xs text-slate-300">Jugadas: <span className="font-bold">{user.stats?.games_played || 0}</span></p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            {/* Actions */}
            {user.role !== 'admin' && (
              <div className="grid grid-cols-3 items-stretch gap-3 border-t border-white/5 pt-3">
                <UserBalanceControl userId={user.id} userName={user.display_name} currentBalance={user.balance_cents} layout="mobile-split" />
                <UserBanControl userId={user.id} isBanned={user.is_banned} userName={user.display_name} layout="mobile-split" />
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
