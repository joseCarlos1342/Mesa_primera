import { getAuditLog } from "@/app/actions/admin-audit";
import { ScrollText, ArrowLeft, Shield, UserCog, CreditCard, Ban, Unlock, Sliders, MessageSquare } from "lucide-react";
import Link from "next/link";

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  deposit_approved:      { label: 'Depósito Aprobado',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CreditCard },
  deposit_rejected:      { label: 'Depósito Rechazado',    color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: CreditCard },
  transaction_approved:  { label: 'Transacción Aprobada',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CreditCard },
  transaction_rejected:  { label: 'Transacción Rechazada', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: CreditCard },
  withdrawal_approved:   { label: 'Retiro Aprobado',       color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: CreditCard },
  withdrawal_rejected:   { label: 'Retiro Rechazado',      color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: CreditCard },
  balance_adjusted:      { label: 'Ajuste de Saldo',       color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: Sliders },
  user_banned:           { label: 'Usuario Baneado',       color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: Ban },
  user_unbanned:         { label: 'Usuario Desbaneado',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Unlock },
  broadcast_sent:        { label: 'Broadcast Enviado',     color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: MessageSquare },
  support_replied:       { label: 'Soporte Respondido',    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: MessageSquare },
  settings_changed:      { label: 'Configuración Cambiada', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Sliders },
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || {
    label: action.replace(/_/g, ' ').toUpperCase(),
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    icon: UserCog,
  }
}

export default async function AdminAuditPage() {
  let entries: Awaited<ReturnType<typeof getAuditLog>> = [];
  let loadError: string | null = null;

  try {
    entries = await getAuditLog(200);
  } catch (err: any) {
    console.error("[AdminAuditPage] Error cargando audit log:", err);
    loadError = err?.message || "Error desconocido al cargar el registro de auditoría";
  }

  if (loadError) {
    return (
      <div className="min-h-full flex items-center justify-center animate-in fade-in duration-700">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-10 max-w-lg text-center">
          <ScrollText className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-400 mb-2">Error al cargar Auditoría</h2>
          <p className="text-slate-400 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="pb-6 border-b border-white/5">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
              <ScrollText className="w-10 h-10 text-amber-400" />
              REGISTRO DE AUDITORÍA
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              Registro inmutable de todas las acciones administrativas.
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
              {entries.length} Registros
            </span>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Administrador</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Objetivo</th>
                <th className="px-6 py-4">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map(entry => {
                const config = getActionConfig(entry.action);
                const Icon = config.icon;
                const details = entry.details || {};

                return (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <br />
                      <span className="text-slate-600">
                        {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{entry.admin?.display_name || 'Admin'}</span>
                        <span className="text-[10px] font-mono text-slate-500">{entry.admin_id.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-white text-xs uppercase tracking-wider">
                          {config.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {entry.target_type && entry.target_id ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{entry.target_type}</span>
                          <span className="text-xs font-mono text-slate-400">{entry.target_id.substring(0, 12)}...</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {Object.keys(details).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(details).slice(0, 4).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-2 text-[10px]">
                              <span className="font-black text-slate-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-slate-300 font-mono truncate max-w-50">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                          {Object.keys(details).length > 4 && (
                            <span className="text-[9px] text-slate-600 italic">+{Object.keys(details).length - 4} más...</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">Sin detalles</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No hay registros de auditoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
