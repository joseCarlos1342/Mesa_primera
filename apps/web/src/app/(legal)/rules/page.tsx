import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Gavel, Coins, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Reglas del Juego — Primera Riverada los 4 Ases',
  description:
    'Conoce las reglas oficiales de Primera Riverada los 4 Ases. Reglas básicas, normas de seguridad, fair play y gestión de apuestas en el club de cartas en Neiva, Huila.',
  alternates: { canonical: '/rules' },
  keywords: [
    'reglas primera riverada',
    'reglas juego primera',
    'reglas los 4 ases',
    'cómo jugar primera',
    'reglas cartas primera',
    'reglamento primera riverada',
    'juego de cartas primera reglas',
  ],
  openGraph: {
    title: 'Reglas del Juego — Primera Riverada los 4 Ases',
    description:
      'Reglas oficiales de Primera Riverada: captura cartas que sumen 15, juega limpio y gestiona tu saldo. Club en Neiva, Huila.',
    url: 'https://primerariveradalos4ases.com/rules',
    type: 'article',
    locale: 'es_CO',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Reglas Primera Riverada los 4 Ases' }],
  },
}

const sections = [
  {
    title: 'Reglas Básicas',
    subtitle: 'El Corazón del Juego',
    icon: BookOpen,
    content:
      'Primera Riverada los 4 Ases es un juego de cartas tradicional. El objetivo es acumular puntos capturando cartas de la mesa que sumen 15 o mediante combinaciones especiales.',
    color: 'text-brand-gold',
    accent: 'border-brand-gold/20',
  },
  {
    title: 'Seguridad y Fair Play',
    subtitle: 'Integridad en la Mesa',
    icon: Gavel,
    content:
      'El uso de software externo o colusión entre jugadores resultará en la suspensión inmediata de la cuenta. Jugamos limpio para divertirnos todos.',
    color: 'text-brand-green',
    accent: 'border-brand-green/20',
  },
  {
    title: 'Apuestas y Saldo',
    subtitle: 'Gestión de Fondos',
    icon: Coins,
    content:
      'Cada mesa tiene un monto de entrada (Buy-in). Asegúrate de tener saldo suficiente antes de unirte. Los retiros se procesan en un plazo de 24hs hábiles.',
    color: 'text-brand-gold-light',
    accent: 'border-brand-gold/20',
  },
]

export default function PublicRulesPage() {
  return (
    <div className="space-y-10">
      <header className="text-center space-y-3">
        <h1 className="text-3xl md:text-5xl font-display font-black italic text-brand-gold uppercase tracking-tighter leading-none drop-shadow-premium">
          Reglamento Oficial
        </h1>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.2em]">
          Estatutos Oficiales • Primera Riverada v3.1
        </p>
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <article key={section.title} className={`bg-black/30 border ${section.accent} rounded-2xl p-6 md:p-8 space-y-4`}>
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-12 h-12 rounded-xl bg-black/60 border border-brand-gold/20 flex items-center justify-center ${section.color}`}>
                <section.icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${section.color} opacity-80`}>
                  {section.subtitle}
                </p>
                <h2 className="text-xl md:text-2xl font-display font-black italic text-[#f3edd7] uppercase tracking-tight">
                  {section.title}
                </h2>
              </div>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-brand-gold/20 via-brand-gold/10 to-transparent" />
            <p className="text-[#f3edd7]/80 font-bold leading-relaxed text-base md:text-lg">
              {section.content}
            </p>
          </article>
        ))}
      </div>

      <div className="text-center pt-4">
        <Link
          href="/register/player"
          className="inline-flex items-center gap-2 px-8 py-4 bg-accent-gold-shimmer text-slate-950 rounded-2xl font-display font-black text-sm uppercase tracking-[0.3em] shadow-lg hover:shadow-xl transition-all italic border-b-4 border-black/30"
        >
          Únete al Club <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
