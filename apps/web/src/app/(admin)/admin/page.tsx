import { LayoutDashboard, Users, CreditCard, ShieldAlert, BarChart3, Gamepad2, AlertTriangle, CheckCircle2, MessageSquare, Bell, Film, ScrollText, Info, Search, Scale, HelpCircle } from "lucide-react";
import Link from "next/link";
import { getAdminDashboardStats } from "@/app/actions/admin-dashboard";
import { formatCurrency } from "@/utils/format";
import { DashboardWarnings } from "@/components/admin/DashboardWarnings";
import { DashboardAutoRefresh } from "@/components/admin/DashboardAutoRefresh";
import { AdminStatusCard, type AdminStatusTone } from "@/components/admin/AdminStatusCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const warnings = "warnings" in statsData ? statsData.warnings : [];
  const fetchedAt = "fetchedAt" in statsData ? statsData.fetchedAt : null;
  const vaultTone: AdminStatusTone =
    statsData.vaultStatus === "OPERATIVO"
      ? "success"
      : statsData.vaultStatus === "ALERTA"
        ? "warning"
        : statsData.vaultStatus === "DESCONOCIDO"
          ? "neutral"
          : "danger";
  const ledgerTone: AdminStatusTone =
    statsData.ledgerIntegrityStatus === "OPERATIVO"
      ? "success"
      : statsData.ledgerIntegrityStatus === "ALERTA"
        ? "warning"
        : "danger";

  const stats = [
    { 
      label: "Fichas en Plataforma", 
      value: formatCurrency(statsData.totalUsersBalance), 
      icon: <CreditCard className="w-5 h-5" />, 
      color: "text-indigo-400",
      mobileFullWidth: true,
      href: "/admin/users"
    },
    { 
      label: "Ganancias (Rake)", 
      value: formatCurrency(statsData.totalRake), 
      icon: <BarChart3 className="w-5 h-5" />, 
      color: "text-emerald-400",
      mobileFullWidth: true,
      href: "/admin/ganancias"
    },
    { 
      label: "Mesas en Curso", 
      value: statsData.activeGames.toString(), 
      icon: <Gamepad2 className="w-5 h-5" />, 
      color: "text-blue-400",
      mobileFullWidth: false,
      href: "/admin/tables"
    },
    { 
      label: "Alertas de Fraude", 
      value: statsData.fraudAccountsCount.toString(), 
      icon: <ShieldAlert className="w-5 h-5" />, 
      color: statsData.fraudAccountsCount > 0 ? "text-red-400" : "text-slate-400",
      mobileFullWidth: false,
      href: "/admin/users?q=fraud"
    },
  ];

  return (
    <div className="min-h-full space-y-10 animate-in fade-in duration-700">
      {warnings.length > 0 ? <DashboardWarnings warnings={warnings} /> : null}

      {/* Dashboard Header */}
      <div className="flex flex-col gap-5 border-b border-white/5 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Resumen operativo
          </div>
          <h1 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text pr-2 text-3xl font-black tracking-tight text-transparent sm:text-4xl">
            Panel de control
          </h1>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 items-start gap-3 md:w-auto md:min-w-[26rem]">
          <AdminStatusCard
            label="Bóveda"
            tone={vaultTone}
            icon={
              statsData.vaultStatus === "OPERATIVO" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : statsData.vaultStatus === "DESCONOCIDO" ? (
                <HelpCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )
            }
            title={statsData.vaultStatus}
            detail={
              statsData.vaultStatus === "DESCONOCIDO"
                ? "Sin lectura disponible"
                : `Cobertura ${statsData.vaultCoverage}%`
            }
            tooltip={
              <>
                <div className="mb-2 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    ¿Qué mide?
                  </p>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
                  Cobertura de la bóveda: compara los depósitos recibidos y los
                  retiros procesados frente a los saldos de usuarios.
                </p>
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Depósitos:</span>
                    <span className="text-emerald-400">
                      {formatCurrency(statsData.vaultTotalDeposits)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Retiros:</span>
                    <span className="text-red-400">
                      -{formatCurrency(statsData.vaultTotalWithdrawals)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold text-slate-300">
                    <span>Bóveda neta:</span>
                    <span>{formatCurrency(statsData.vaultBalance)}</span>
                  </div>
                </div>
              </>
            }
          />

          <AdminStatusCard
            label="Libro Mayor"
            tone={ledgerTone}
            icon={
              statsData.ledgerIntegrityStatus === "OPERATIVO" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )
            }
            title={statsData.ledgerIntegrityStatus}
            detail={
              statsData.ledgerIntegrityDiff === 0
                ? "Sin diferencias"
                : `Diff ${formatCurrency(statsData.ledgerIntegrityDiff)}`
            }
            tooltip={
              <>
                <div className="mb-2 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    ¿Qué mide?
                  </p>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
                  Consistencia financiera: compara el neto del ledger con la suma
                  de saldos en wallets.
                </p>
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Ledger neto:</span>
                    <span>{formatCurrency(statsData.totalLedgerBalance)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Saldo wallets:</span>
                    <span>{formatCurrency(statsData.totalUsersBalance)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
                    <span className="text-slate-300">Diferencia:</span>
                    <span
                      className={
                        statsData.ledgerIntegrityDiff === 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {formatCurrency(statsData.ledgerIntegrityDiff)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 border-t border-white/5 pt-2 text-[10px] text-slate-500">
                  <p>• <span className="text-emerald-400">OPERATIVO</span>: Diff = 0</p>
                  <p>• <span className="text-amber-400">ALERTA</span>: Diff {'<='} $1.000</p>
                  <p>• <span className="text-red-400">CRÍTICO</span>: Diff {'>'} $1.000</p>
                </div>
              </>
            }
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Link 
            key={i} 
            href={stat.href}
            className={`group min-w-0 rounded-[2rem] border border-white/5 bg-slate-900/40 p-5 shadow-lg backdrop-blur-lg transition-all hover:border-white/20 hover:bg-slate-900/60 sm:p-6 ${stat.mobileFullWidth ? "col-span-2 lg:col-span-1" : ""}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-slate-950/50 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              {fetchedAt ? <DashboardAutoRefresh fetchedAt={fetchedAt} /> : null}
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="min-w-0 whitespace-nowrap text-[clamp(1.65rem,6vw,3rem)] font-black leading-none tracking-[-0.05em] text-white tabular-nums">{stat.value}</p>
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
                <span className="text-3xl font-black text-white">Registro Admin</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <ScrollText className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/security" className="group relative overflow-hidden bg-linear-to-br from-red-500/10 to-transparent backdrop-blur-2xl border border-red-500/20 p-6 rounded-4xl hover:scale-[1.02] transition-all hover:border-red-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Seguridad</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">MFA y sesiones</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/server-log" className="group relative overflow-hidden bg-linear-to-br from-rose-500/10 to-transparent backdrop-blur-2xl border border-rose-500/20 p-6 rounded-4xl hover:scale-[1.02] transition-all hover:border-rose-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Log del Servidor</h3>
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
        <Link href="/admin/consultas" className="group relative overflow-hidden bg-gradient-to-br from-teal-500/10 to-transparent backdrop-blur-2xl border border-teal-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-teal-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
              <Search className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Consultas</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">Investigar</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Search className="w-20 h-20" />
          </div>
        </Link>

        <Link href="/admin/disputes" className="group relative overflow-hidden bg-gradient-to-br from-pink-500/10 to-transparent backdrop-blur-2xl border border-pink-500/20 p-6 rounded-[2rem] hover:scale-[1.02] transition-all hover:border-pink-500/40 shadow-2xl">
          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
              <Scale className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">Disputas</h3>
            </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">Gestión</span>
             </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Scale className="w-20 h-20" />
          </div>
        </Link>      </div>
    </div>
  );
}
