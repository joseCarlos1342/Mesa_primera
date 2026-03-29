import { LayoutDashboard, Users, CreditCard, ShieldAlert, BarChart3, Settings, Gamepad2, AlertTriangle, CheckCircle2, MessageSquare, Bell } from "lucide-react";
import Link from "next/link";
import { getAdminDashboardStats } from "@/app/actions/admin-dashboard";
import { formatCurrency } from "@/utils/format";

export default async function AdminPage() {
  const statsData = await getAdminDashboardStats();

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
          <h1 className="text-5xl font-black italic tracking-tight leading-tight bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
            CENTRO DE MANDO
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gestión administrativa y control de boveda.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/admin/broadcast" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95">
            <MessageSquare className="w-5 h-5" />
            NUEVO BROADCAST
          </Link>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Bóveda</p>
              <p className="text-emerald-400 font-bold text-sm">OPERATIVO • 100%</p>
            </div>
          </div>
          
          <div className={`backdrop-blur-xl border px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl ${
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
      </div>
    </div>
  );
}
