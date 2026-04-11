import { LayoutDashboard, Users, CreditCard, ShieldAlert, BarChart3, Gamepad2, AlertTriangle, CheckCircle2, MessageSquare, Bell, Film, ScrollText, Info } from "lucide-react";
import Link from "next/link";
import { getAdminDashboardStats } from "@/app/actions/admin-dashboard";
import { formatCurrency } from "@/utils/format";

export default async function AdminPage() {
  let statsData: Awaited<ReturnType<typeof getAdminDashboardStats>>;
  try {
    statsData = await getAdminDashboardStats();
  } catch (err: any) {
    console.error("[AdminPage] Error cargando estadísticas:", err);
    return (
      <div className="min-h-full flex items-center justify-center animate-in fade-in duration-700">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-10 max-w-lg text-center">
          <LayoutDashboard className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-400 mb-2">Error al cargar el Dashboard</h2>
          <p className="text-slate-400 text-sm">{err?.message || "Error desconocido"}</p>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: "Fichas en Plataforma", 
      value: formatCurrency(statsData.totalUsersBalance), 
      icon: <CreditCard className="w-5 h-5" />, 
      color: "text-indigo-400",
      href: "/admin/users"
    },
    { 
      label: "Ganancias (Rake)", 
      value: formatCurrency(statsData.totalRake), 
      icon: <BarChart3 className="w-5 h-5" />, 
      color: "text-emerald-400",
      href: "/admin/ganancias"
    },
    { 
      label: "Mesas en Curso", 
      value: statsData.activeGames.toString(), 
      icon: <Gamepad2 className="w-5 h-5" />, 
      color: "text-blue-400",
      href: "/admin/tables"
    },
    { 
      label: "Alertas de Fraude", 
      value: statsData.fraudAccountsCount.toString(), 
      icon: <ShieldAlert className="w-5 h-5" />, 
      color: statsData.fraudAccountsCount > 0 ? "text-red-400" : "text-slate-400",
      href: "/admin/users?q=fraud"
    },
  ];

  return (
    <div className="min-h-full space-y-10 animate-in fade-in duration-700">
      {/* Welcome & Time Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-black tracking-[0.3em] text-[10px] uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Sistema Operativo
          </div>
          <h1 className="text-5xl font-black italic tracking-tight leading-tight bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent pr-2">
            CENTRO DE MANDO
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gestión administrativa y control de boveda.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/admin/broadcast" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95">
            <MessageSquare className="w-5 h-5" />
            NUEVO BROADCAST
          </Link>
          <div className={`group relative backdrop-blur-xl border px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl cursor-help ${
            statsData.vaultStatus === "OPERATIVO" ? "bg-emerald-900/20 border-emerald-500/20" :
            statsData.vaultStatus === "ALERTA" ? "bg-amber-900/20 border-amber-500/20" :
            "bg-red-900/20 border-red-500/20"
          }`}>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Status Bóveda</p>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                {statsData.vaultStatus === "OPERATIVO" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                <p className={`font-bold text-sm ${
                  statsData.vaultStatus === "OPERATIVO" ? "text-emerald-400" :
                  statsData.vaultStatus === "ALERTA" ? "text-amber-400" :
                  "text-red-400"
                }`}>{statsData.vaultStatus} • {statsData.vaultCoverage}%</p>
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 w-72 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">¿Qué mide?</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">Cobertura de la bóveda: compara los depósitos recibidos vs retiros procesados contra los saldos de usuarios. Si la cobertura es 100%+, la plataforma puede cubrir todos los saldos.</p>
              <div className="space-y-1.5 text-[10px] font-mono">
                <div className="flex justify-between text-slate-400"><span>Depósitos:</span><span className="text-emerald-400">{formatCurrency(statsData.vaultTotalDeposits)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Retiros:</span><span className="text-red-400">-{formatCurrency(statsData.vaultTotalWithdrawals)}</span></div>
                <div className="border-t border-white/5 pt-1.5 flex justify-between text-slate-300 font-bold"><span>Bóveda neta:</span><span>{formatCurrency(statsData.vaultBalance)}</span></div>
              </div>
            </div>
          </div>
          
          <div className={`group relative backdrop-blur-xl border px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl cursor-help ${
            statsData.ledgerIntegrityStatus === "OPERATIVO" ? "bg-emerald-900/20 border-emerald-500/20" :
            statsData.ledgerIntegrityStatus === "ALERTA" ? "bg-amber-900/20 border-amber-500/20" :
            "bg-red-900/20 border-red-500/20"
          }`}>
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Integridad Ledger</p>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  {statsData.ledgerIntegrityStatus === "OPERATIVO" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  <p className={`font-bold text-sm ${
                    statsData.ledgerIntegrityStatus === "OPERATIVO" ? "text-emerald-400" :
                    statsData.ledgerIntegrityStatus === "ALERTA" ? "text-amber-400" :
                    "text-red-400"
                  }`}>{statsData.ledgerIntegrityStatus}</p>
                </div>
                {statsData.ledgerIntegrityDiff !== 0 && (
                  <p className="text-[10px] text-red-300 font-mono mt-0.5">Diff: {formatCurrency(statsData.ledgerIntegrityDiff)}</p>
                )}
             </div>
             {/* Tooltip */}
             <div className="absolute bottom-full right-0 mb-2 w-72 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
               <div className="flex items-center gap-2 mb-2">
                 <Info className="w-3.5 h-3.5 text-slate-400" />
                 <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">¿Qué mide?</p>
               </div>
               <p className="text-[11px] text-slate-400 leading-relaxed mb-3">Consistencia financiera: compara la suma neta del ledger (créditos − débitos) con la suma de los saldos en wallets. Si hay diferencia, existe una discrepancia contable que debe investigarse.</p>
               <div className="space-y-1.5 text-[10px] font-mono">
                 <div className="flex justify-between text-slate-400"><span>Ledger neto:</span><span>{formatCurrency(statsData.totalLedgerBalance)}</span></div>
                 <div className="flex justify-between text-slate-400"><span>Saldo wallets:</span><span>{formatCurrency(statsData.totalUsersBalance)}</span></div>
                 <div className="border-t border-white/5 pt-1.5 flex justify-between font-bold"><span className="text-slate-300">Diferencia:</span><span className={statsData.ledgerIntegrityDiff === 0 ? "text-emerald-400" : "text-red-400"}>{formatCurrency(statsData.ledgerIntegrityDiff)}</span></div>
               </div>
               <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] text-slate-500">
                 <p>• <span className="text-emerald-400">OPERATIVO</span>: Diff = 0</p>
                 <p>• <span className="text-amber-400">ALERTA</span>: Diff {'<='} $1.000</p>
                 <p>• <span className="text-red-400">CRÍTICO</span>: Diff {'>'} $1.000</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Link 
            key={i} 
            href={stat.href}
            className="group backdrop-blur-lg bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] hover:border-white/20 transition-all hover:bg-slate-900/60 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-slate-950/50 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-600 tracking-tighter">REFRESH: LIVE</span>
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black tracking-tight text-white">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Link href="/admin/deposits" className="group relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-transparent backdrop-blur-2xl border border-indigo-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-indigo-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <CreditCard className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Depósitos</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{statsData.pendingDeposits}</span>
                <span className="text-sm text-slate-400 font-medium mb-1">pendientes</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/withdrawals" className="group relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-transparent backdrop-blur-2xl border border-amber-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-amber-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Retiros</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{statsData.pendingWithdrawals}</span>
                <span className="text-sm text-slate-400 font-medium mb-1">pendientes</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/users" className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-2xl border border-emerald-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-emerald-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Usuarios</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">Gestión</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/ledger" className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-2xl border border-blue-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-blue-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <LayoutDashboard className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Ledger</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">Auditar</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <LayoutDashboard className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/support" className="group relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-transparent backdrop-blur-2xl border border-purple-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-purple-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Soporte</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{statsData.pendingSupport}</span>
                <span className="text-sm text-slate-400 font-medium mb-1">pendientes</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <MessageSquare className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/alerts" className="group relative overflow-hidden bg-gradient-to-br from-red-500/10 to-transparent backdrop-blur-2xl border border-red-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-red-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <Bell className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Alertas Mesa</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{statsData.pendingAlerts}</span>
                <span className="text-sm text-slate-400 font-medium mb-1">pendientes</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Bell className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/replays" className="group relative overflow-hidden bg-linear-to-br from-purple-500/10 to-transparent backdrop-blur-2xl border border-purple-500/20 p-6 rounded-4xl hover:scale-[1.02] transition-all hover:border-purple-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Film className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Repeticiones</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">Auditar</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Film className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/audit" className="group relative overflow-hidden bg-linear-to-br from-amber-500/10 to-transparent backdrop-blur-2xl border border-amber-500/20 p-6 rounded-4xl hover:scale-[1.02] transition-all hover:border-amber-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <ScrollText className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Auditoría</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">Admin Log</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <ScrollText className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/server-log" className="group relative overflow-hidden bg-linear-to-br from-rose-500/10 to-transparent backdrop-blur-2xl border border-rose-500/20 p-6 rounded-4xl hover:scale-[1.02] transition-all hover:border-rose-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Server Log</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">Motor</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="w-20 h-20" />
          </div>
        </Link>
      </div>
    </div>
  );
}
