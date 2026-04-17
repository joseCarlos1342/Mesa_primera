"use client";

import { useState, useMemo } from "react";
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Gamepad2, Users } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { ResponsiveDataView } from "@/components/admin/ResponsiveDataView";

type LedgerEntry = {
  id: string;
  user_id: string | null;
  amount_cents: number;
  direction: "credit" | "debit";
  balance_after_cents: number;
  type: string;
  status: string;
  reference_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  deposit: "Depósito",
  withdrawal: "Retiro",
  win: "Ganancia",
  bet: "Apuesta",
  rake: "Comisión",
  refund: "Reembolso",
  adjustment: "Ajuste",
  transfer_in: "Transferencia (entrada)",
  transfer_out: "Transferencia (salida)",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  pending: "Pendiente",
  failed: "Fallido",
};

export function UserLedgerTable({ entries }: { entries: LedgerEntry[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const types = useMemo(() => [...new Set(entries.map((e) => e.type))], [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (directionFilter !== "all" && e.direction !== directionFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (e.description || "").toLowerCase().includes(q) ||
          (e.reference_id || "").toLowerCase().includes(q) ||
          (e.metadata?.table_name || "").toLowerCase().includes(q) ||
          (e.metadata?.room_id || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, typeFilter, directionFilter, searchQuery]);

  return (
    <ResponsiveDataView
      columns={[
        {
          key: "date",
          header: "Fecha",
          render: (entry) => (
            <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
              {new Date(entry.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
              <br />
              <span className="text-slate-600">
                {new Date(entry.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </span>
          ),
        },
        {
          key: "concept",
          header: "Concepto",
          render: (entry) => {
            const isGame = ["win", "bet", "rake"].includes(entry.type);
            return (
              <div>
                <div className="flex items-center gap-2">
                  {isGame ? (
                    <Gamepad2 className="w-4 h-4 text-purple-400 shrink-0" />
                  ) : entry.direction === "credit" ? (
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-bold text-white uppercase text-xs tracking-wider">
                    {TYPE_LABELS[entry.type] || entry.type}
                  </span>
                </div>
                <span
                  className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded mt-1 inline-block ${
                    entry.status === "completed" ? "bg-emerald-500/20 text-emerald-400"
                      : entry.status === "pending" ? "bg-amber-500/20 text-amber-500"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {STATUS_LABELS[entry.status] || entry.status}
                </span>
              </div>
            );
          },
        },
        {
          key: "description",
          header: "Descripción",
          render: (entry) => {
            const meta = entry.metadata || {};
            return (
              <div className="text-xs text-slate-400">
                <span className="wrap-break-word">{entry.description || "—"}</span>
                {meta.players_present && meta.players_present.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="text-[9px] text-purple-300 wrap-break-word">
                      {meta.players_present.map((p: any) => p.odisplayName || p.nickname).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            );
          },
        },
        {
          key: "room",
          header: "Sala / Ref",
          render: (entry) => {
            const meta = entry.metadata || {};
            return (
              <span className="text-xs font-mono text-slate-500">
                {meta.room_id ? (
                  <span>
                    <span className="text-purple-300">{String(meta.room_id).slice(0, 8)}...</span>
                    {meta.table_name && <span className="block text-[9px] text-slate-600">{meta.table_name}</span>}
                  </span>
                ) : entry.reference_id ? (
                  <span>{String(entry.reference_id).slice(0, 12)}...</span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </span>
            );
          },
        },
        {
          key: "debit",
          header: "Débito",
          headerAlign: "right",
          align: "right",
          render: (entry) => (
            <span className="font-black text-red-400">
              {entry.direction === "debit" ? formatCurrency(entry.amount_cents) : ""}
            </span>
          ),
        },
        {
          key: "credit",
          header: "Crédito",
          headerAlign: "right",
          align: "right",
          render: (entry) => (
            <span className="font-black text-emerald-400">
              {entry.direction === "credit" ? formatCurrency(entry.amount_cents) : ""}
            </span>
          ),
        },
        {
          key: "balance",
          header: "Saldo",
          headerAlign: "right",
          align: "right",
          render: (entry) => (
            <span className="font-mono text-slate-300 font-bold">
              {formatCurrency(entry.balance_after_cents)}
            </span>
          ),
        },
      ]}
      data={filtered}
      keyExtractor={(entry) => entry.id}
      emptyMessage="No hay registros que coincidan con los filtros."
      cardClassName={() => "mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] first:mt-3 last:mb-3"}
      header={
        <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50 flex flex-wrap justify-between items-center gap-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            Historial ({filtered.length} de {entries.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar en descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-52"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="all">Todos los tipos</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] || t}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {["all", "credit", "debit"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDirectionFilter(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    directionFilter === d
                      ? d === "credit" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : d === "debit" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-white/10 text-white border border-white/20"
                      : "bg-slate-900/40 text-slate-500 border border-white/5 hover:border-white/10"
                  }`}
                >
                  {d === "all" ? "Todos" : d === "credit" ? "Créditos" : "Débitos"}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      renderCard={(entry) => {
        const meta = entry.metadata || {};
        const isGame = ["win", "bet", "rake"].includes(entry.type);
        return (
          <div className="space-y-3">
            <div className="border-b border-white/5 pb-2">
              <p className="inline-flex items-center gap-2 whitespace-nowrap text-[10px] font-mono text-slate-300">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Fecha
                </span>
                {new Date(entry.created_at).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Concepto
                </p>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start gap-1.5">
                    {isGame ? (
                      <Gamepad2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    ) : entry.direction === "credit" ? (
                      <ArrowDownLeft className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <p className="wrap-break-word text-xs font-bold uppercase tracking-wider text-white">
                      {TYPE_LABELS[entry.type] || entry.type}
                    </p>
                  </div>
                  <span
                    className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                      entry.status === "completed" ? "bg-emerald-500/20 text-emerald-400"
                        : entry.status === "pending" ? "bg-amber-500/20 text-amber-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {STATUS_LABELS[entry.status] || entry.status}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Sala / Ref
                </p>
                {meta.room_id ? (
                  <>
                    <p className="text-xs font-mono text-purple-300">
                      {String(meta.room_id).slice(0, 8)}...
                    </p>
                    {meta.table_name ? (
                      <p className="mt-1 wrap-break-word text-[10px] text-slate-500">
                        {meta.table_name}
                      </p>
                    ) : null}
                  </>
                ) : entry.reference_id ? (
                  <p className="text-xs font-mono text-slate-500">
                    {String(entry.reference_id).slice(0, 12)}...
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">—</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                  {entry.direction === "debit" ? "Débito" : "Crédito"}
                </p>
                <p className={`font-black ${entry.direction === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                  {entry.direction === "credit" ? "+" : "-"}{formatCurrency(entry.amount_cents)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Saldo</p>
                <p className="font-mono text-slate-300 font-bold">{formatCurrency(entry.balance_after_cents)}</p>
              </div>
            </div>
            {/* Description */}
            {entry.description && (
              <div className="border-t border-white/5 pt-2">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Descripción
                </p>
                <p className="wrap-break-word text-[10px] text-slate-500">{entry.description}</p>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
