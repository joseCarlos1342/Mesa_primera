"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getServerAlerts, resolveAlert, type ServerAlert } from "@/app/actions/admin-server-alerts";
import { createClient } from "@/utils/supabase/client";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, Search, Filter, Bell } from "lucide-react";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof AlertTriangle }> = {
  critical: { label: "CRÍTICO", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: ShieldAlert },
  warning: { label: "ALERTA", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertTriangle },
  info: { label: "INFO", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Info },
};

const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identidad",
  settlement: "Settlement",
  discrepancy: "Discrepancia",
  collusion: "Colusión",
  refund: "Reembolso",
  system: "Sistema",
};

export default function ServerLogPage() {
  const [alerts, setAlerts] = useState<ServerAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getServerAlerts(200);
      setAlerts(data);
    } catch (err) {
      console.error("Error loading alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("server-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "server_alerts" },
        (payload: { new: ServerAlert }) => {
          setAlerts((prev) => [payload.new as ServerAlert, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleResolve = (alertId: string) => {
    startTransition(async () => {
      await resolveAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, resolved: true, resolved_at: new Date().toISOString() } : a))
      );
    });
  };

  const filtered = alerts.filter((a) => {
    if (!showResolved && a.resolved) return false;
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.message || "").toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = [...new Set(alerts.map((a) => a.category))];

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center animate-in fade-in duration-700">
        <div className="text-slate-500 font-bold animate-pulse">Cargando alertas del servidor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="pb-6 border-b border-white/5">
        <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
          <Bell className="w-10 h-10 text-red-400" />
          LOG DEL SERVIDOR
        </h1>
        <p className="text-slate-500 font-medium mt-2">
          Alertas críticas emitidas por el motor de juego en tiempo real.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar en alertas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {/* Severity */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {["all", "critical", "warning", "info"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                severityFilter === s
                  ? s === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : s === "warning" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : s === "info" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/10 text-white border border-white/20"
                  : "bg-slate-900/40 text-slate-500 border border-white/5 hover:border-white/10"
              }`}
            >
              {s === "all" ? "Todos" : SEVERITY_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] || c}
            </option>
          ))}
        </select>

        {/* Show Resolved toggle */}
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
            showResolved
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-slate-900/40 text-slate-500 border-white/5"
          }`}
        >
          {showResolved ? "✓ Resueltas visibles" : "Mostrar resueltas"}
        </button>

        <span className="text-xs font-mono text-slate-600 ml-auto">
          {filtered.length} de {alerts.length}
        </span>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-bold">Sin alertas{!showResolved ? " pendientes" : ""}</p>
          </div>
        ) : (
          filtered.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className={`${config.bg} border ${config.border} rounded-2xl p-5 transition-all ${
                  alert.resolved ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Icon className={`w-5 h-5 ${config.color} shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 py-0.5 bg-slate-900/40 rounded">
                          {CATEGORY_LABELS[alert.category] || alert.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600">
                          {new Date(alert.created_at).toLocaleString("es-ES")}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">{alert.title}</h3>
                      {alert.message && (
                        <p className="text-xs text-slate-400 mt-1 break-all">{alert.message}</p>
                      )}
                      {alert.room_id && (
                        <p className="text-[10px] font-mono text-slate-600 mt-1">
                          Sala: {alert.room_id}
                          {alert.game_id ? ` • Juego: ${alert.game_id.substring(0, 8)}...` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {!alert.resolved && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={isPending}
                      className="shrink-0 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 disabled:opacity-50"
                    >
                      Resolver
                    </button>
                  )}
                  {alert.resolved && (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-emerald-400/50">
                      ✓ Resuelta
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
