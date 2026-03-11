'use client'

import { motion } from 'framer-motion'
import { BookOpen, ShieldCheck, HelpCircle, AlertCircle } from 'lucide-react'

export default function RulesPage() {
  const sections = [
    {
      title: 'Reglas Básicas',
      icon: BookOpen,
      content: 'Mesa Primera es un juego de cartas tradicional. El objetivo es acumular puntos capturando cartas de la mesa que sumen 15 o mediante combinaciones especiales.',
      color: 'text-blue-400'
    },
    {
      title: 'Seguridad y Fair Play',
      icon: ShieldCheck,
      content: 'El uso de software externo o colusión entre jugadores resultará en la suspensión inmediata de la cuenta. Jugamos limpio para divertirnos todos.',
      color: 'text-emerald-400'
    },
    {
      title: 'Apuestas y Bits',
      icon: AlertCircle,
      content: 'Cada mesa tiene un monto de entrada (Buy-in). Asegúrate de tener saldo suficiente antes de unirte. Los retiros se procesan en un plazo de 24hs hábiles.',
      color: 'text-amber-400'
    }
  ]

  return (
    <div className="min-h-full py-12 px-6 max-w-lg mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2">
        <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">Reglamento</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Guía esencial para jugadores</p>
      </header>

      <div className="space-y-6">
        {sections.map((section, i) => (
          <motion.div 
            key={section.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-white/5 ${section.color}`}>
                <section.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black italic text-slate-200 uppercase tracking-tighter">{section.title}</h3>
            </div>
            <p className="text-slate-400 font-medium leading-relaxed">
              {section.content}
            </p>
          </motion.div>
        ))}
      </div>

      <section className="p-8 bg-indigo-600/10 rounded-[2rem] border border-dashed border-indigo-500/30 flex flex-col items-center text-center gap-4">
        <HelpCircle className="w-10 h-10 text-indigo-400" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-white uppercase tracking-widest">¿Necesitas ayuda?</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
            Nuestro soporte técnico está disponible 24/7 para resolver cualquier duda.
          </p>
        </div>
        <button className="w-full h-14 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white">
          Contactar Soporte
        </button>
      </section>
    </div>
  )
}
