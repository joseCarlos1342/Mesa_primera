'use client'

import { motion } from 'framer-motion'
import { BookOpen, HelpCircle, Sparkles, Gavel, Coins } from 'lucide-react'

export default function RulesPage() {
  const sections = [
    {
      title: 'Reglas Básicas',
      subtitle: 'El Corazón del Juego',
      icon: BookOpen,
      content: 'Primera Riverada los 4 Ases es un juego de cartas tradicional. El objetivo es acumular puntos capturando cartas de la mesa que sumen 15 o mediante combinaciones especiales.',
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
    <div className="min-h-screen bg-transparent pt-12 pb-20 px-6 max-w-2xl mx-auto space-y-10 animate-in fade-in duration-1000">
      {/* Header Section */}
      <header className="relative space-y-4 text-center px-4 overflow-visible">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-3 px-5 py-2 bg-brand-gold/10 border border-brand-gold/20 rounded-full mb-1"
        >
          <Sparkles className="w-5 h-5 text-brand-gold" />
          <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] whitespace-nowrap">Manual Primera Riverada</span>
        </motion.div>
        
        <div className="space-y-1 overflow-visible">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black italic text-brand-gold uppercase tracking-tighter leading-none pr-1 drop-shadow-premium">
            Reglamento
          </h1>
        </div>

        {/* Decorative Divider */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent" />
          <div className="w-2.5 h-2.5 rounded-full bg-brand-gold shadow-[0_0_15px_rgba(202,171,114,0.8)]" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent via-brand-gold/30 to-transparent" />
        </div>
      </header>

      <div className="space-y-8">
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
            
            <div className="relative bg-black/40 backdrop-blur-3xl border-brand-gold/10 border p-8 md:p-10 rounded-[3.5rem] space-y-6 hover:bg-black/60 hover:border-brand-gold/30 transition-all duration-500 shadow-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1 max-w-[65%]">
                  <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${section.color} opacity-80 mb-1`}>
                    {section.subtitle}
                  </p>
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-display font-black italic text-[#f3edd7] uppercase tracking-tight leading-[1.1]">
                    {section.title}
                  </h3>
                </div>
                <div className={`shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-black/60 border border-brand-gold/20 flex items-center justify-center ${section.color} shadow-inner transition-all duration-500 group-hover:scale-110`}>
                  <section.icon className="w-6 h-6 md:w-9 md:h-9" />
                </div>
              </div>
              
              <div className="h-px w-full bg-gradient-to-r from-brand-gold/20 via-brand-gold/10 to-transparent" />
              
              <p className="text-[#f3edd7]/80 font-bold leading-relaxed text-lg md:text-xl max-w-prose">
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
        className="relative p-10 md:p-12 bg-black/40 backdrop-blur-3xl rounded-[4rem] border border-brand-gold/10 overflow-hidden flex flex-col items-center text-center gap-6 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-gold/5 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-brand-gold/20 shadow-inner flex items-center justify-center">
          <HelpCircle className="w-8 h-8 text-brand-gold" />
        </div>
        
        <div className="space-y-2">
          <h4 className="text-2xl font-display font-black text-[#f3edd7] uppercase italic tracking-tighter leading-none">¿Dudas en la mesa?</h4>
          <p className="text-[11px] text-text-secondary font-black uppercase tracking-[0.2em] leading-relaxed max-w-xs mx-auto opacity-50">
            Nuestro equipo de conserjería está disponible 24/7 para asistir a los miembros del club.
          </p>
        </div>
        
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
          className="group relative w-full h-16 bg-accent-gold-shimmer text-slate-950 rounded-[1.8rem] font-display font-black text-sm uppercase tracking-[0.4em] shadow-lg active:translate-y-1 active:shadow-inner transition-all italic border-b-4 border-black/30 overflow-hidden flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
          <span className="relative z-10">Contactar</span>
        </button>
      </motion.section>
      
      {/* Scroll Tip */}
      <footer className="text-center pt-2 pb-8 opacity-30">
        <p className="text-[10px] font-black text-[#f3edd7] uppercase tracking-[0.5em]">
          Estatutos Oficiales • Primera Riverada v3.1
        </p>
      </footer>
    </div>
  )
}
