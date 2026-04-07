"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createTable } from "@/app/actions/admin-tables";
import { useRouter } from "next/navigation";

export function CreateTableModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    min_bet: 5000,
    max_players: 7,
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTable(formData);
      setIsOpen(false);
      router.refresh();
      setFormData({ name: "", min_bet: 5000, max_players: 7 });
    } catch (error: any) {
      alert("Error al crear mesa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
      >
        <Plus className="w-5 h-5" />
        CREAR MESA
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter text-white">NUEVA MESA</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Configuración del local para "Primera".</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nombre de la Mesa</label>
              <input 
                type="text" 
                required
                placeholder="Ej: Mesa de Oro, VIP, Sótano..."
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Mínimo Bet ($)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
                  value={formData.min_bet}
                  onChange={(e) => setFormData({ ...formData, min_bet: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Máx. Jugadores</label>
                <select 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner appearance-none"
                  value={formData.max_players}
                  onChange={(e) => setFormData({ ...formData, max_players: Number(e.target.value) })}
                >
                  {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} Jugadores</option>)}
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-[1.5rem] transition-all shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-[0.2em] text-sm"
            >
              {loading ? "PROCESANDO..." : "CONFIRMAR CREACIÓN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
