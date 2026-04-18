import { BarChart3, TrendingUp, Calendar, Hash } from "lucide-react";
import Link from "next/link";
import { getAdminRakeData } from "@/app/actions/admin-rake";
import { formatCurrency } from "@/utils/format";
import { ResponsiveDataView } from "@/components/admin/ResponsiveDataView";

export default async function GananciasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const pageSize = 50;
  const { entries, totalCount, stats } = await getAdminRakeData(page, pageSize);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <h1 className="text-3xl font-black italic tracking-tight bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent">
              GANANCIAS 5%
            </h1>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            Desglose detallado de cada comisión cobrada por la casa.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="backdrop-blur-lg bg-emerald-900/20 border border-emerald-500/20 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest">
              Total Acumulado
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {formatCurrency(stats.totalRake)}
          </p>
        </div>

        <div className="backdrop-blur-lg bg-blue-900/20 border border-blue-500/20 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">
              Últimas 24h
            </span>
          </div>
          <p className="text-2xl font-black text-blue-400">
            {formatCurrency(stats.totalRake24h)}
          </p>
        </div>

        <div className="backdrop-blur-lg bg-indigo-900/20 border border-indigo-500/20 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest">
              Últimos 7 días
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-400">
            {formatCurrency(stats.totalRake7d)}
          </p>
        </div>

        <div className="backdrop-blur-lg bg-amber-900/20 border border-amber-500/20 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black text-amber-400/60 uppercase tracking-widest">
              Total Cobros
            </span>
          </div>
          <p className="text-2xl font-black text-amber-400">
            {stats.rakeCount}
          </p>
        </div>
      </div>

      {/* Earnings Table */}
      <ResponsiveDataView
        columns={[
          {
            key: "date",
            header: "Fecha",
            render: (entry) => {
              const date = new Date(entry.created_at);
              return (
                <span className="text-slate-400 font-mono text-xs whitespace-nowrap">
                  {date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                  <span className="text-slate-600">{date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
              );
            },
          },
          {
            key: "game_id",
            header: "ID Partida",
            render: (entry) => (
              <span className="text-slate-400 font-mono text-xs break-all">{entry.game_id || "—"}</span>
            ),
          },
          {
            key: "winner",
            header: "Ganador",
            render: (entry) => (
              <span className="text-white font-bold text-sm">{entry.winner_username}</span>
            ),
          },
          {
            key: "net_pot",
            header: "Premios",
            align: "right",
            render: (entry) => (
              <span className="text-emerald-400 font-mono font-bold whitespace-nowrap">{formatCurrency(entry.win_amount || 0)}</span>
            ),
          },
          {
            key: "rake",
            header: "Ganancia (Casa)",
            align: "right",
            render: (entry) => (
              <span className="text-amber-400 font-mono font-bold whitespace-nowrap">{formatCurrency(entry.amount_cents)}</span>
            ),
          },
          {
            key: "total_pot",
            header: "Total Apostado",
            align: "right",
            render: (entry) => (
              <span className="text-white font-mono font-bold whitespace-nowrap">{formatCurrency((entry.win_amount || 0) + entry.amount_cents)}</span>
            ),
          },
        ]}
        data={entries}
        keyExtractor={(entry) => entry.id}
        emptyMessage="No hay ganancias registradas aún."
        header={
          <div className="p-4 border-b border-white/5">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              Historial de Comisiones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada fila representa un 5% cobrado automáticamente al entregar el pozo al ganador.
            </p>
          </div>
        }
        footer={
          totalPages > 1 ? (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <span className="text-xs text-slate-500 font-bold">
                Página {page} de {totalPages} ({totalCount} registros)
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/ganancias?page=${page - 1}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/ganancias?page=${page + 1}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            </div>
          ) : undefined
        }
        renderCard={(entry) => {
          const totalPot = (entry.win_amount || 0) + entry.amount_cents;
          const date = new Date(entry.created_at);
          return (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-slate-400 whitespace-nowrap">
                    {date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                    <span className="text-slate-600">{date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
                  </p>
                  {entry.game_id && (
                    <p className="mt-2 text-[10px] font-mono text-slate-600 break-all">ID: {entry.game_id}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Ganador</p>
                  <p className="text-base font-black text-white whitespace-nowrap">{entry.winner_username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Premios</p>
                  <p className="text-emerald-400 font-mono font-bold text-base whitespace-nowrap">{formatCurrency(entry.win_amount || 0)}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Ganancia</p>
                  <p className="text-amber-400 font-mono font-bold text-base whitespace-nowrap">{formatCurrency(entry.amount_cents)}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/5 bg-white/3 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Apostado</p>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-slate-400">Ganador + comisión</span>
                    <p className="text-white font-mono font-bold text-base whitespace-nowrap">{formatCurrency(totalPot)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
        cardClassName={() => "mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] first:mt-3 last:mb-3"}
        className="backdrop-blur-lg rounded-2xl"
      />
    </div>
  );
}
