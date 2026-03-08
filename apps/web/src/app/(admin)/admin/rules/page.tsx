import { getRulebook } from "@/app/actions/admin-settings";
import { FileText, Info } from "lucide-react";
import { RulesEditor } from "@/components/admin/RulesEditor";

export default async function AdminRulesPage() {
  const initialRules = await getRulebook();

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <div className="pb-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
            <FileText className="w-10 h-10 text-emerald-400" />
            REGLAMENTO DEL LOCAL
            </h1>
            <p className="text-slate-500 font-medium mt-2">
            Edita las reglas públicas, rake general y normas que verán los jugadores. (Formato Markdown)
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         <div className="xl:col-span-2">
            <RulesEditor initialContent={initialRules} />
         </div>

         <div className="space-y-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                <Info className="w-10 h-10 text-indigo-500/20 absolute -right-2 -top-2" />
                <h3 className="font-bold text-indigo-400 mb-2">Formato Soportado</h3>
                <p className="text-sm text-indigo-200/80 mb-4">
                   Puedes utilizar formato <strong className="text-white">Markdown</strong> para estructurar las reglas:
                </p>
                <div className="space-y-3 font-mono text-xs text-slate-300 bg-black/40 p-4 rounded-xl border border-white/5">
                   <p><span className="text-emerald-400">#</span> Título Principal</p>
                   <p><span className="text-emerald-400">##</span> Subtítulo</p>
                   <p><span className="text-emerald-400">**</span>Negrita<span className="text-emerald-400">**</span></p>
                   <p><span className="text-emerald-400">-</span> Lista con viñetas</p>
                   <p><span className="text-emerald-400">1.</span> Lista numerada</p>
                </div>
            </div>
            
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
                <h3 className="font-bold text-slate-400 mb-2">Historial de Cambios</h3>
                <p className="text-sm text-slate-500">
                   Las modificaciones se guardarán en el registro de auditoría.
                </p>
            </div>
         </div>
      </div>
    </div>
  );
}
