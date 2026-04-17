"use client";

import { useState } from "react";
import { 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  ChevronRight,
  Sparkles,
  Zap,
  Bell,
  ShieldAlert,
  Settings
} from "lucide-react";
import { sendBroadcast } from "@/app/actions/admin-broadcast";
import type { BroadcastInput, BroadcastType } from "@/lib/broadcast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const NOTIFICATION_TYPES: Array<{ id: BroadcastType; label: string; icon: typeof Sparkles; color: string; bg: string; border: string }> = [
  { id: "system_announcement", label: "Anuncio del Sistema", icon: Sparkles, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  { id: "maintenance", label: "Mantenimiento", icon: Settings, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "promo", label: "Promoción / Bono", icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { id: "security", label: "Alerta de Seguridad", icon: ShieldAlert, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
];

export default function AdminBroadcastPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [formData, setFormData] = useState<BroadcastInput>({
    title: "",
    body: "",
    type: "system_announcement",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("¿Confirmas el envío masivo? Esta acción notificará a todos los usuarios registrados y no se puede deshacer.")) return;

    setLoading(true);
    setSuccess(null);
    try {
      const result = await sendBroadcast(formData);
      setSuccess(result.audienceCount);
      // Wait a bit before clearing so the user sees the success state clearly
      setTimeout(() => {
        setFormData({ title: "", body: "", type: "system_announcement" });
        setSuccess(null);
      }, 5000);
    } catch (error: any) {
      alert("Error al enviar broadcast: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = NOTIFICATION_TYPES.find(t => t.id === formData.type) || NOTIFICATION_TYPES[0];

  return (
    <div className="min-h-screen pb-20 px-4 md:px-0">
      <div className="max-w-5xl mx-auto pt-8">
        {/* Header Section */}
        <header className="mb-12 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-3">
                  Sistema de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Broadcast</span>
                </h1>
                <p className="text-slate-400 text-base md:text-lg max-w-2xl font-medium leading-relaxed">
                  Lanza notificaciones globales instantáneas. Tu mensaje llegará a todos los rincones de <span className="text-white font-bold italic">Primera Riverada</span> con un solo clic.
                </p>
              </div>
              <div className="hidden md:flex flex-none items-center justify-center w-24 h-24 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative">
                <Bell className="w-10 h-10 text-indigo-400 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 shadow-lg shadow-red-500/40" />
              </div>
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Form Block */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8"
          >
            <div className="relative group">
              {/* Outer Glow Decoration */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-[2.5rem] blur-xl group-hover:blur-2xl transition-all opacity-50" />
              
              <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-6 md:p-10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                {/* Visual Texture */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Selector de Tipo */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {NOTIFICATION_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isActive = formData.type === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type.id })}
                          className={`
                            flex flex-col items-center justify-center p-4 rounded-3xl border transition-all relative overflow-hidden
                            ${isActive 
                              ? `${type.bg} ${type.border} ring-2 ring-indigo-500/20 scale-105 z-10 shadow-lg` 
                              : "bg-white/5 border-white/5 hover:border-white/10 opacity-60 hover:opacity-80"}
                          `}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${isActive ? type.color : "text-white"}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider text-center ${isActive ? "text-white" : "text-slate-400"}`}>
                            {type.label.split(' ')[0]}
                          </span>
                          {isActive && (
                            <motion.div layoutId="active-bg" className="absolute inset-0 bg-white/[0.03]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 px-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                         <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Encabezado Visual</label>
                       </div>
                       <input 
                         type="text" 
                         required
                         placeholder="Ej: Nuevo Gran Torneo el viernes..."
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
                         value={formData.title}
                         onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                       />
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center gap-2 px-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                         <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Contenido del Mensaje</label>
                       </div>
                       <textarea 
                         required
                         rows={5}
                         placeholder="Escribe los detalles aquí... Recuerda ser conciso e impactante."
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner resize-none min-h-[160px]"
                         value={formData.body}
                         onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                       />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={loading || !formData.title || !formData.body}
                      className="group/btn relative w-full overflow-hidden rounded-2xl disabled:opacity-50 disabled:grayscale"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 transition-transform group-hover/btn:scale-105 duration-300" />
                      <div className="relative flex items-center justify-center gap-4 py-6 text-white font-black text-lg tracking-[0.2em] uppercase transition-all group-active/btn:scale-95">
                        {loading ? (
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>SINCRONIZANDO...</span>
                          </div>
                        ) : (
                           <>
                             <Send className="w-6 h-6 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                             EJECUTAR
                           </>
                        )}
                      </div>
                    </button>
                    
                    <p className="text-[10px] text-center text-slate-600 mt-4 uppercase font-bold tracking-widest">
                       Protocolo de seguridad activo • Acceso nivel Administrador
                    </p>
                  </div>
                </form>

                {/* Status Overlay for success */}
                <AnimatePresence>
                  {success !== null && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-50 p-8"
                    >
                      <div className="text-center space-y-4">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Broadcast Exitoso</h2>
                        <p className="text-slate-400 text-lg">
                          Información enviada con éxito a <span className="text-emerald-400 font-bold">{success}</span> dispositivos activos.
                        </p>
                        <button 
                          onClick={() => setSuccess(null)}
                          className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold transition-all border border-white/10"
                        >
                          ENTENDIDO
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Side Panels */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Preview Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4" /> Live Preview
                </h3>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                </div>
              </div>

              {/* Notification Mockup - High End */}
              <div className="bg-slate-950/80 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden min-h-[160px]">
                <div className="p-1.5 pb-0">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-1 w-full rounded-t-full rounded-b-sm" />
                </div>
                
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl ${selectedType.bg} border ${selectedType.border} flex items-center justify-center`}>
                        <selectedType.icon className={`w-5 h-5 ${selectedType.color}`} />
                      </div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${selectedType.color}`}>{selectedType.label}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Primera Riverada Official</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">AHORA</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-white font-black text-xl leading-tight tracking-tight">
                      {formData.title || "Tu título de impacto"}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
                      {formData.body || "Aquí se mostrará el cuerpo del mensaje. Los jugadores verán esto al entrar al lobby o durante su sesión activa de juego."}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-800" />
                      ))}
                      <div className="w-6 h-6 rounded-full border-2 border-slate-950 bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white">+1K</div>
                    </div>
                    <Link href="/admin/broadcast/history" className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 group hover:text-indigo-300 transition-colors">
                      DETALLES <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Decorative Blur */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[60px] pointer-events-none" />
            </motion.div>

            {/* Constraints/Rules */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-black/20 border border-white/5 p-6 rounded-[2rem] space-y-6"
            >
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Protocolo de Envío
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { text: "Impacto inmediato en dispositivos activos.", highlight: "Global" },
                  { text: "Persistente en el historial del usuario.", highlight: "Inbox" },
                  { text: "Uso racional solo para avisos críticos.", highlight: "Anti-Spam" }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex flex-none items-center justify-center text-[10px] font-black italic text-slate-500">
                      0{idx + 1}
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold leading-tight mb-1">{item.highlight}</p>
                      <p className="text-slate-500 text-[11px] leading-snug">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
