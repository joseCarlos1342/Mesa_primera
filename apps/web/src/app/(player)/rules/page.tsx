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
    <div className="min-h-screen bg-table py-16 px-6 max-w-2xl mx-auto space-y-16 animate-in fade-in duration-1000">
      {/* Header Section */}
      <header className="relative space-y-6 text-center px-4 overflow-visible">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-3 px-5 py-2 bg-accent-gold/10 border border-accent-gold/20 rounded-full mb-2"
        >
          <Sparkles className="w-5 h-5 text-accent-gold" />
          <span className="text-[10px] font-black text-accent-gold uppercase tracking-[0.3em]">Manual de Élite</span>
        </motion.div>
        
        <div className="space-y-2 overflow-visible">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black italic text-accent-gold-shimmer bg-clip-text text-transparent uppercase tracking-tighter leading-none pr-2 drop-shadow-premium">
            Reglamento
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] opacity-80">
            Mesa Primera • Private Club
          </p>
        </div>

        {/* Decorative Divider */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent" />
          <div className="w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_15px_rgba(197,160,89,0.8)]" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent via-accent-gold/30 to-transparent" />
        </div>
      </header>

      <div className="space-y-10">
        {sections.map((section, i) => (
          <motion.div 
            key={section.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.8 }}
            className="group relative"
          >
            {/* Background Glow */}
            <div className={`absolute -inset-2 rounded-[3.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl ${section.accent}`} />
            
            <div className="relative bg-bg-poker/30 backdrop-blur-2xl border-brass border-2 p-10 md:p-12 rounded-[3.5rem] space-y-8 hover:bg-bg-poker/50 transition-all duration-500 shadow-premium">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-2">
                  <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${section.color} opacity-80 mb-2`}>
                    {section.subtitle}
                  </p>
                  <h3 className="text-3xl md:text-4xl font-display font-black italic text-white uppercase tracking-tight">
                    {section.title}
                  </h3>
                </div>
                <div className={`p-5 rounded-2xl bg-slate-900/60 border border-white/10 ${section.color} shadow-premium`}>
                  <section.icon className="w-10 h-10" />
                </div>
              </div>
              
              <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
              
              <p className="text-slate-300 font-bold leading-relaxed text-xl max-w-prose">
                {section.content}
              </p>
              
              {/* Card Footer Decoration */}
              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <Sparkles className={`w-5 h-5 ${section.color} opacity-40 animate-pulse`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Support Section */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative p-12 bg-slate-950/40 backdrop-blur-3xl rounded-[4rem] border-2 border-white/5 overflow-hidden flex flex-col items-center text-center gap-8 shadow-premium"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent-gold/5 rounded-full blur-3xl -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-gold/5 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="p-6 rounded-full bg-accent-gold/10 border border-accent-gold/20 shadow-premium">
          <HelpCircle className="w-12 h-12 text-accent-gold" />
        </div>
        
        <div className="space-y-3">
          <h4 className="text-2xl font-display font-black text-white uppercase italic tracking-tighter">¿Dudas en la mesa?</h4>
          <p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.3em] leading-relaxed max-w-sm mx-auto">
            Nuestro equipo de conserjería está disponible 24/7 para asistir a los miembros del club.
          </p>
        </div>
        
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
          className="w-full max-w-xs h-20 bg-accent-gold-shimmer text-slate-950 rounded-[1.8rem] font-display font-black text-sm uppercase tracking-[0.4em] shadow-premium active:translate-y-1 active:border-b-2 border-t-2 border-white/20 border-b-4 border-black/40 transition-all hover:scale-[1.02] italic"
        >
          Contactar Conserje
        </button>
      </motion.section>
      
      {/* Scroll Tip */}
      <footer className="text-center pt-8 pb-16 opacity-30">
        <p className="text-[10px] font-black text-white uppercase tracking-[0.5em]">
          Estatutos Oficiales • Mesa Primera v2.0
        </p>
      </footer>
    </div>
  )
}
