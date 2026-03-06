import { LayoutDashboard, Users, CreditCard, ShieldAlert, BarChart3, Settings } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const stats = [
    { label: "Móviles Activos", value: "24", icon: <Users className="w-5 h-5" />, color: "text-indigo-400" },
    { label: "Total Ledger", value: "1,240.50 FC", icon: <CreditCard className="w-5 h-5" />, color: "text-emerald-400" },
    { label: "Alertas Seguridad", value: "0", icon: <ShieldAlert className="w-5 h-5" />, color: "text-red-400" },
    { label: "Volumen 24h", value: "850 FC", icon: <BarChart3 className="w-5 h-5" />, color: "text-amber-400" },
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
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
            CENTRO DE MANDO
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gestión administrativa y control de boveda.</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Bóveda</p>
            <p className="text-emerald-400 font-bold text-sm">OPERATIVO • 100%</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Servidor</p>
            <p className="text-white font-bold text-sm">US-EAST-1</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="group backdrop-blur-lg bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] hover:border-white/20 transition-all hover:bg-slate-900/60 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-slate-950/50 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-600 tracking-tighter">REFRESH: 2S</span>
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black tracking-tight text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/admin/deposits" className="group relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-transparent backdrop-blur-2xl border border-indigo-500/20 p-8 rounded-[2.5rem] hover:scale-[1.02] transition-all hover:border-indigo-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-6 items-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <CreditCard className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-white">Depósitos</h3>
              <p className="text-slate-500 text-sm font-medium">Validar comprobantes y cargar fichas.</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-24 h-24" />
          </div>
        </Link>

        <Link href="/admin/withdrawals" className="group relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-transparent backdrop-blur-2xl border border-amber-500/20 p-8 rounded-[2.5rem] hover:scale-[1.02] transition-all hover:border-amber-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-6 items-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-white">Retiros</h3>
              <p className="text-slate-500 text-sm font-medium">Procesar colas de retiro de boveda.</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-24 h-24" />
          </div>
        </Link>
      </div>
    </div>
  );
}
