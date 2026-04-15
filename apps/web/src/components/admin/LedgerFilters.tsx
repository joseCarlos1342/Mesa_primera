"use client";

import { useState, useMemo } from "react";
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Eye, Wallet, Users } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";
import { ResponsiveDataView } from "@/components/admin/ResponsiveDataView";

type UserWithBalance = {
  id: string;
  display_name: string;
  username: string | null;
  balance: number;
  total_credits: number;
  total_debits: number;
  last_activity: string | null;
};

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
  user?: { display_name: string } | null;
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

export function LedgerUsersFilter({ users }: { users: UserWithBalance[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        u.id.toLowerCase().startsWith(q)
    );
  }, [users, search]);

  const totalBalance = filtered.reduce((sum, u) => sum + u.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-black text-white flex items-center gap-3">
          <Users className="w-5 h-5 text-emerald-400" />
          Jugadores Registrados
          <span className="text-sm font-bold text-slate-500 ml-2">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar jugador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors w-60"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
              Total: {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>
      </div>

      <ResponsiveDataView
        columns={[
          {
            key: "player",
            header: "Jugador",
            render: (user) => (
              <div className="flex flex-col">
                <span className="font-bold text-white">{user.display_name}</span>
                <span className="text-[10px] font-mono text-slate-500">{user.id.substring(0, 8)}...</span>
              </div>
            ),
          },
          {
            key: "balance",
            header: "Saldo Actual",
            headerAlign: "right",
            align: "right",
            render: (user) => (
              <span className={`font-black text-lg ${user.balance > 0 ? "text-emerald-400" : user.balance < 0 ? "text-red-400" : "text-slate-400"}`}>
                {formatCurrency(user.balance)}
              </span>
            ),
          },
          {
            key: "credits",
            header: "Total Créditos",
            headerAlign: "right",
            align: "right",
            render: (user) => (
              <span className="text-emerald-400 font-bold">+{formatCurrency(user.total_credits)}</span>
            ),
          },
          {
            key: "debits",
            header: "Total Débitos",
            headerAlign: "right",
            align: "right",
            render: (user) => (
              <span className="text-red-400 font-bold">-{formatCurrency(user.total_debits)}</span>
            ),
          },
          {
            key: "activity",
            header: "Última Actividad",
            render: (user) => (
              <span className="text-xs font-mono text-slate-400">
                {user.last_activity ? new Date(user.last_activity).toLocaleString("es-ES") : "—"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "Acciones",
            headerAlign: "center",
            align: "center",
            render: (user) => (
              <Link
                href={`/admin/ledger/${user.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 border border-indigo-500/20"
              >
                <Eye className="w-3.5 h-3.5" />
                Desglose
              </Link>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(user) => user.id}
        emptyMessage={search ? "No se encontraron jugadores." : "No hay usuarios registrados."}
        renderCard={(user) => (
          <div className="space-y-3">
            {/* Header: player info + balance */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white">{user.display_name}</p>
                <p className="text-[10px] font-mono text-slate-500">{user.id.substring(0, 8)}...</p>
              </div>
              <span className={`font-black text-lg ${user.balance > 0 ? "text-emerald-400" : user.balance < 0 ? "text-red-400" : "text-slate-400"}`}>
                {formatCurrency(user.balance)}
              </span>
            </div>
            {/* Credits / Debits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Créditos</p>
                <p className="text-emerald-400 font-bold">+{formatCurrency(user.total_credits)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Débitos</p>
                <p className="text-red-400 font-bold">-{formatCurrency(user.total_debits)}</p>
              </div>
            </div>
            {/* Activity + CTA */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[10px] font-mono text-slate-500">
                {user.last_activity ? new Date(user.last_activity).toLocaleString("es-ES") : "Sin actividad"}
              </span>
              <Link
                href={`/admin/ledger/${user.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/20"
              >
                <Eye className="w-3 h-3" />
                Desglose
              </Link>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export function LedgerTransactionsFilter({ entries }: { entries: LedgerEntry[] }) {
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
          (e.user?.display_name || "").toLowerCase().includes(q) ||
          (e.description || "").toLowerCase().includes(q) ||
          (e.user_id || "").toLowerCase().startsWith(q)
        );
      }
      return true;
    });
  }, [entries, typeFilter, directionFilter, searchQuery]);

  return (
    <div className="mt-8">
      <ResponsiveDataView
        columns={[
          {
            key: "date",
            header: "Fecha",
            render: (entry) => (
              <span className="text-xs font-mono text-slate-400">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            ),
          },
          {
            key: "type",
            header: "Tipo & Status",
            render: (entry) => (
              <div className="flex flex-col gap-1">
                <p className="font-bold flex items-center gap-2 text-white">
                  {entry.direction === "credit" ? (
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                  )}
                  {entry.type.toUpperCase().replace(/_/g, " ")}
                </p>
                <span
                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded w-max ${
                    entry.status === "completed" ? "bg-emerald-500/20 text-emerald-400"
                      : entry.status === "pending" ? "bg-amber-500/20 text-amber-500"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {entry.status}
                </span>
              </div>
            ),
          },
          {
            key: "user",
            header: "Usuario",
            render: (entry) =>
              entry.user_id ? (
                <div className="flex flex-col">
                  <span className="font-bold text-white">{entry.user?.display_name || "Desconocido"}</span>
                  <span className="text-[10px] font-mono text-slate-500">{entry.user_id.substring(0, 8)}...</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">SISTEMA / BÓVEDA</span>
              ),
          },
          {
            key: "amount",
            header: "Monto",
            headerAlign: "right",
            align: "right",
            render: (entry) => (
              <span className={`font-black ${entry.direction === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                {entry.direction === "credit" ? "+" : "-"}
                {formatCurrency(entry.amount_cents)}
              </span>
            ),
          },
          {
            key: "balance",
            header: "Balance Resultante",
            headerAlign: "right",
            align: "right",
            render: (entry) => (
              <span className="font-mono text-slate-300">
                {formatCurrency(entry.balance_after_cents)}
              </span>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(entry) => entry.id}
        emptyMessage="No hay registros que coincidan con los filtros."
        header={
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50 flex flex-wrap justify-between items-center gap-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              Transacciones ({filtered.length})
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-44"
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
        renderCard={(entry) => (
          <div className="space-y-2">
            {/* Type badge + date */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {entry.direction === "credit" ? (
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-red-400" />
                )}
                <span className="font-bold text-white text-xs uppercase">
                  {entry.type.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                    entry.status === "completed" ? "bg-emerald-500/20 text-emerald-400"
                      : entry.status === "pending" ? "bg-amber-500/20 text-amber-500"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {entry.status}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
            {/* Amount + balance + user */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Monto</p>
                <p className={`font-black ${entry.direction === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                  {entry.direction === "credit" ? "+" : "-"}{formatCurrency(entry.amount_cents)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Balance</p>
                <p className="font-mono text-slate-300">{formatCurrency(entry.balance_after_cents)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Usuario</p>
                {entry.user_id ? (
                  <p className="font-bold text-white text-sm">{entry.user?.display_name || "Desconocido"}</p>
                ) : (
                  <p className="text-xs text-slate-500 italic">SISTEMA</p>
                )}
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
