"use client";

import { useState } from "react";
import { MessageSquare, Send, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { sendBroadcast } from "@/app/actions/admin-broadcast";
import { useRouter } from "next/navigation";

export default function AdminBroadcastPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    type: "system_announcement",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("¿Estás seguro de enviar esta notificación a TODOS los usuarios?")) return;

    setLoading(true);
    setSuccess(null);
    try {
      const result = await sendBroadcast(formData);
      setSuccess(result.count);
      setFormData({ title: "", body: "", type: "system_announcement" });
    } catch (error: any) {
      alert("Error al enviar broadcast: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full space-y-10 animate-in fade-in duration-700 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <Link href="/admin" className="text-slate-500 hover:text-white flex items-center gap-2 mb-4 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Centro de Mando
          </Link>
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
            <MessageSquare className="w-12 h-12 text-indigo-400" />
            BROADCAST (NUEVA NOTIFICACIÓN MASIVA)
          </h1>
          <p className="text-slate-500 font-medium mt-2">Envía avisos, actualizaciones o promociones a toda la base de jugadores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-8">
             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Título de la Notificación</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Mantenimiento programado, ¡Nuevos torneos!..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-5 text-xl font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Mensaje (Cuerpo)</label>
                <textarea 
                  required
                  rows={5}
                  placeholder="Escribe el mensaje detallado aquí..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner resize-none"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Tipo de Aviso</label>
                   <select 
                     className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner appearance-none font-bold"
                     value={formData.type}
                     onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                   >
                     <option value="system_announcement">📣 Anuncio del Sistema</option>
                     <option value="maintenance">🛠 Mantenimiento</option>
                     <option value="promo">🎁 Promoción / Bono</option>
                     <option value="security">🛡 Alerta de Seguridad</option>
                   </select>
                </div>
                <div className="flex items-end">
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                   >
                     {loading ? "ENVIANDO..." : (
                        <>
                           <Send className="w-5 h-5" />
                           LANZAR AHORA
                        </>
                     )}
                   </button>
                </div>
             </div>
          </form>

          {success !== null && (
             <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                   <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                   <h4 className="font-black text-emerald-400 uppercase tracking-tight">¡Éxito total!</h4>
                   <p className="text-emerald-200/70 text-sm">Se han enviado {success} notificaciones en tiempo real.</p>
                </div>
             </div>
          )}
        </div>

        <div className="space-y-8">
           <div className="bg-slate-950 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertCircle className="w-16 h-16 text-indigo-400" />
             </div>
             <h3 className="font-black italic text-white mb-4 uppercase tracking-tight">REGLAS CRÍTICAS</h3>
             <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex gap-3">
                   <span className="text-indigo-400 font-black">•</span>
                   El mensaje llegará a <strong className="text-white">TODOS</strong> los jugadores activos instantáneamente.
                </li>
                <li className="flex gap-3">
                   <span className="text-indigo-400 font-black">•</span>
                   Usa este canal solo para avisos de <strong className="text-white">ALTO IMPACTO</strong> para evitar el spam.
                </li>
                <li className="flex gap-3">
                   <span className="text-indigo-400 font-black">•</span>
                   Las notificaciones son persistentes y el usuario podrá verlas en su bandeja al entrar.
                </li>
             </ul>
           </div>

           <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/10 p-8 rounded-[2.5rem]">
              <h3 className="font-black italic text-indigo-400 mb-2 uppercase tracking-tight">VISTA PREVIA</h3>
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl opacity-60 pointer-events-none scale-95 origin-top shadow-xl">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{formData.type.replace('_', ' ')}</p>
                 <h4 className="font-black text-white text-lg mb-1">{formData.title || "Título del aviso"}</h4>
                 <p className="text-xs text-slate-400 line-clamp-2">{formData.body || "Aquí aparecerá el cuerpo de tu mensaje para el jugador..."}</p>
                 <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold">HACE 1 MIN</span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
