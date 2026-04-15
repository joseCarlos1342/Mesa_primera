import { getAuditLog } from "@/app/actions/admin-audit";
import { ScrollText, Shield, UserCog, CreditCard, Ban, Unlock, Sliders, MessageSquare } from "lucide-react";
import { ResponsiveDataView } from "@/components/admin/ResponsiveDataView";

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
      <ResponsiveDataView
        columns={[
          {
            key: "date",
            header: "Fecha / Hora",
            render: (entry) => (
              <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                {new Date(entry.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                <br />
                <span className="text-slate-600">
                  {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </span>
            ),
          },
          {
            key: "admin",
            header: "Administrador",
            render: (entry) => (
              <div className="flex flex-col">
                <span className="font-bold text-white">{entry.admin?.display_name || 'Admin'}</span>
                <span className="text-[10px] font-mono text-slate-500 break-all">{entry.admin_id.substring(0, 8)}...</span>
              </div>
            ),
          },
          {
            key: "action",
            header: "Acción",
            render: (entry) => {
              const config = getActionConfig(entry.action);
              const Icon = config.icon;
              return (
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    {config.label}
                  </span>
                </div>
              );
            },
          },
          {
            key: "target",
            header: "Objetivo",
            render: (entry) =>
              entry.target_type && entry.target_id ? (
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{entry.target_type}</span>
                  <span className="text-xs font-mono text-slate-400 break-all">{entry.target_id.substring(0, 12)}...</span>
                </div>
              ) : (
                <span className="text-xs text-slate-600 italic">—</span>
              ),
          },
          {
            key: "details",
            header: "Detalles",
            cardFullWidth: true,
            render: (entry) => {
              const details = entry.details || {};
              return Object.keys(details).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(details).slice(0, 4).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 text-[10px]">
                      <span className="font-black text-slate-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-slate-300 font-mono break-all">
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
              );
            },
          },
        ]}
        data={entries}
        keyExtractor={(entry) => entry.id}
        emptyMessage="No hay registros de auditoría."
        renderCard={(entry) => {
          const config = getActionConfig(entry.action);
          const Icon = config.icon;
          const details = entry.details || {};
          return (
            <div className="space-y-3">
              {/* Top: date + action badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(entry.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                  {new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-black uppercase tracking-wider ${config.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                </div>
              </div>
              {/* Admin + target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Admin</p>
                  <p className="font-bold text-white text-sm">{entry.admin?.display_name || 'Admin'}</p>
                  <p className="text-[10px] font-mono text-slate-500 break-all">{entry.admin_id.substring(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Objetivo</p>
                  {entry.target_type && entry.target_id ? (
                    <>
                      <p className="text-[10px] font-black text-slate-400 uppercase">{entry.target_type}</p>
                      <p className="text-xs font-mono text-slate-400 break-all">{entry.target_id.substring(0, 12)}...</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-600 italic">—</p>
                  )}
                </div>
              </div>
              {/* Details */}
              {Object.keys(details).length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-1">
                  {Object.entries(details).slice(0, 4).map(([key, val]) => (
                    <div key={key} className="flex items-start gap-2 text-[10px]">
                      <span className="font-black text-slate-500 uppercase tracking-wider shrink-0">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-slate-300 font-mono break-all">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(details).length > 4 && (
                    <span className="text-[9px] text-slate-600 italic">+{Object.keys(details).length - 4} más...</span>
                  )}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
