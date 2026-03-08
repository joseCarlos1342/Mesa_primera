"use client";

import { useState } from "react";
import { updateRulebook } from "@/app/actions/admin-settings";
import { Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function RulesEditor({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateRulebook(content);
      alert("Reglamento guardado exitosamente.");
      router.refresh();
    } catch (e: any) {
      alert("Error guardando el reglamento: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <textarea
        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-6 text-slate-300 font-mono text-sm min-h-[500px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe el reglamento en formato Markdown..."
      />
      <div className="flex justify-end">
         <button
            onClick={handleSave}
            disabled={loading || content === initialContent}
            className="px-6 py-3 rounded-xl font-black tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none bg-indigo-600 hover:bg-indigo-500 text-white"
         >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            GUARDAR CAMBIOS
         </button>
      </div>
    </div>
  );
}
