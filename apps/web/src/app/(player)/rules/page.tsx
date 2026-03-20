'use client'

import { motion } from 'framer-motion'
import { BookOpen, ShieldCheck, HelpCircle, AlertCircle, Sparkles, Gavel, Coins } from 'lucide-react'

export default function RulesPage() {
  const sections = [
    {
      title: 'Reglas Básicas',
      subtitle: 'El Corazón del Juego',
      icon: BookOpen,
      content: 'Mesa Primera es un juego de cartas tradicional. El objetivo es acumular puntos capturando cartas de la mesa que sumen 15 o mediante combinaciones especiales.',
      color: 'text-brand-gold',
      accent: 'bg-brand-gold/10'
    },
    {
      title: 'Seguridad y Fair Play',
      subtitle: 'Integridad en la Mesa',
      icon: Gavel,
      content: 'El uso de software externo o colusión entre jugadores resultará en la suspensión inmediata de la cuenta. Jugamos limpio para divertirnos todos.',
      color: 'text-brand-green',
      accent: 'bg-brand-green/10'
    },
    {
      title: 'Apuestas y Bits',
      subtitle: 'Gestión de Fondos',
      icon: Coins,
      content: 'Cada mesa tiene un monto de entrada (Buy-in). Asegúrate de tener saldo suficiente antes de unirte. Los retiros se procesan en un plazo de 24hs hábiles.',
      color: 'text-brand-gold-light',
      accent: 'bg-brand-gold/10'
    }
  ]

  return (
    <div className="min-h-full py-12 px-6 max-w-2xl mx-auto space-y-12 animate-in fade-in duration-1000">
      {/* Header Section */}
      <header className="relative space-y-4 text-center px-4 overflow-visible">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full mb-2"
        >
          <Sparkles className="w-4 h-4 text-brand-gold" />
          <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Manual del Jugador</span>
        </motion.div>
        
        <div className="space-y-1 overflow-visible">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black italic text-white uppercase tracking-tighter leading-none pr-2">
            Reglamento
          </h1>
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] opacity-60">
            Mesa Primera • Elite Club
          </p>
        </div>

        {/* Decorative Divider */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-brand-gold/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-gold shadow-[0_0_10px_rgba(226,176,68,0.5)]" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-brand-gold/30" />
        </div>
      </header>

      <div className="space-y-8">
        {sections.map((section, i) => (
          <motion.div 
            key={section.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className="group relative"
          >
            {/* Background Glow */}
            <div className={`absolute -inset-1 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl ${section.accent}`} />
            
            <div className="relative bg-slate-950/40 backdrop-blur-xl border border-white/5 p-8 md:p-10 rounded-[2.5rem] space-y-6 hover:border-brand-gold/20 transition-all duration-500 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${section.color} opacity-80 mb-2`}>
                    {section.subtitle}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-display font-black italic text-text-premium uppercase tracking-tight">
                    {section.title}
                  </h3>
                </div>
                <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 ${section.color} shadow-inner`}>
                  <section.icon className="w-8 h-8" />
                </div>
              </div>
              
              <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
              
              <p className="text-slate-400 font-medium leading-relaxed text-lg max-w-prose">
                {section.content}
              </p>
              
              {/* Card Footer Decoration */}
              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <Sparkles className={`w-4 h-4 ${section.color} opacity-40`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Support Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative p-10 bg-brand-gold/5 rounded-[3rem] border border-brand-gold/20 overflow-hidden flex flex-col items-center text-center gap-6"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl -ml-16 -mb-16" />
        
        <div className="p-5 rounded-full bg-brand-gold/10 border border-brand-gold/20 shadow-xl">
          <HelpCircle className="w-10 h-10 text-brand-gold" />
        </div>
        
        <div className="space-y-2">
          <h4 className="text-xl font-display font-black text-white uppercase italic tracking-tighter">¿Dudas en la mesa?</h4>
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest leading-loose max-w-xs mx-auto">
            Nuestro equipo de conserjería está disponible 24/7 para asistir a los miembros del club.
          </p>
        </div>
        
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
          className="w-full max-w-xs h-16 bg-brand-gold hover:bg-brand-gold-light text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(226,176,68,0.25)] active:scale-95 transition-all"
        >
          Contactar Soporte
        </button>
      </motion.section>
      
      {/* Scroll Tip */}
      <footer className="text-center pt-8 pb-12 opacity-20">
        <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
          Estatutos Oficiales • Mesa Primera v2.0
        </p>
      </footer>
    </div>
  )
}
