"use client";

import { useEffect, useState } from "react";
import { getBroadcastHistory, type BroadcastHistoryRow } from "@/app/actions/admin-broadcast";
import { Bell, Settings, Zap, ShieldAlert, Sparkles, Mail, MailCheck, MailX, Eye } from "lucide-react";

const TYPE_META: Record<string, { icon: typeof Sparkles; color: string }> = {
  system_announcement: { icon: Sparkles, color: "text-indigo-400" },
  maintenance: { icon: Settings, color: "text-amber-400" },
  promo: { icon: Zap, color: "text-emerald-400" },
  security: { icon: ShieldAlert, color: "text-rose-400" },
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export default function BroadcastHistoryPage() {
  const [rows, setRows] = useState<BroadcastHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBroadcastHistory(50)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-20 px-4 md:px-0">
      <div className="max-w-5xl mx-auto pt-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Historial de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Broadcasts
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Registro completo de todas las notificaciones enviadas.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">No hay broadcasts enviados todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const meta = TYPE_META[row.type] || TYPE_META.system_announcement;
              const Icon = meta.icon;
              return (
                <div
                  key={row.id}
                  className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold text-sm truncate">{row.title}</h3>
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                          {relativeTime(row.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs line-clamp-2 mb-3">{row.body}</p>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-4 text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="text-white font-bold">{row.audience_count}</span> enviados
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-emerald-400 font-bold">{row.read_count}</span> leídos
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <MailCheck className="w-3.5 h-3.5" />
                          <span className="text-cyan-400 font-bold">{row.push_sent_count}</span> push&nbsp;OK
                        </span>
                        {row.push_failed_count > 0 && (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <MailX className="w-3.5 h-3.5" />
                            <span className="text-rose-400 font-bold">{row.push_failed_count}</span> push&nbsp;fail
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
