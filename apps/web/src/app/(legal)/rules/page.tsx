import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, Clock3, Coins, Gavel, Scale, ShieldCheck, Trophy } from 'lucide-react'
import {
  OFFICIAL_RULEBOOK,
  OFFICIAL_RULEBOOK_EFFECTIVE_DATE,
  OFFICIAL_RULEBOOK_VERSION,
} from '@/lib/official-rulebook'

export const metadata: Metadata = {
  title: 'Reglas del Juego — Primera Riverada los 4 Ases',
  description:
    'Reglamento oficial de Primera Riverada los 4 Ases: cartas, combinaciones, apuestas, pozos, desempates, rake y reconexión.',
  alternates: { canonical: '/rules' },
  keywords: [
    'reglas primera riverada',
    'reglas juego primera',
    'reglas los 4 ases',
    'cómo jugar primera',
    'reglamento primera riverada',
  ],
  openGraph: {
    title: 'Reglas del Juego — Primera Riverada los 4 Ases',
    description:
      'Reglamento oficial de Primera Riverada: combinaciones de cuatro cartas, apuestas, pozos y juego limpio.',
    url: 'https://primerariveradalos4ases.com/rules',
    type: 'article',
    locale: 'es_CO',
    images: [{ url: '/og-image', width: 1200, height: 630, alt: 'Reglas Primera Riverada los 4 Ases' }],
  },
}

const iconForSection = (index: number) => {
  if (index === 0) return BookOpen
  if ([3, 5, 18, 19].includes(index)) return Trophy
  if ([6, 7, 8, 9, 10, 14, 15, 16].includes(index)) return Coins
  if ([22, 23].includes(index)) return Scale
  if (index === 24) return Clock3
  if (index === 25) return ShieldCheck
  return Gavel
}

export default function PublicRulesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 pb-12">
      <header className="relative overflow-hidden rounded-[28px] border border-brand-gold/25 bg-[radial-gradient(circle_at_top_right,rgba(226,176,68,0.18),transparent_42%),linear-gradient(135deg,rgba(27,77,62,0.96),rgba(10,10,10,0.98))] px-6 py-10 shadow-[0_24px_70px_rgba(0,0,0,0.36)] md:px-12 md:py-14">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-brand-gold/10" />
        <div className="pointer-events-none absolute -right-4 -top-8 h-40 w-40 rounded-full border border-brand-gold/10" />
        <div className="relative max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-brand-gold-light">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-black uppercase tracking-[0.28em]">Documento vinculante de juego</span>
          </div>
          <h1 className="font-display text-4xl font-black italic uppercase leading-[0.95] tracking-tight text-brand-gold-light md:text-6xl">
            Reglamento Oficial
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[#f3edd7]/80 md:text-xl">
            La guía completa de una mano de Primera Riverada: desde el pique hasta la liquidación de cada pozo.
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Estatutos Oficiales · Reglamento versión {OFFICIAL_RULEBOOK_VERSION}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-gold/80">
            <span>Vigente desde {OFFICIAL_RULEBOOK_EFFECTIVE_DATE}</span>
          </div>
        </div>
      </header>

      <section aria-labelledby="rules-index-title" className="rounded-3xl border border-brand-gold/15 bg-black/25 p-5 md:p-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-brand-gold">Mapa de la mesa</p>
            <h2 id="rules-index-title" className="mt-1 font-display text-2xl font-black italic uppercase text-[#f3edd7]">Índice de reglas</h2>
          </div>
          <span className="hidden text-xs font-bold uppercase tracking-widest text-[#f3edd7]/40 sm:block">{OFFICIAL_RULEBOOK.length} capítulos</span>
        </div>
        <nav aria-label="Índice del reglamento" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICIAL_RULEBOOK.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="group rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition-colors hover:border-brand-gold/35 hover:bg-brand-gold/10">
              <span className="block text-sm font-bold text-[#f3edd7]/80 group-hover:text-brand-gold-light">{section.title}</span>
              <span className="mt-1 block text-xs text-[#f3edd7]/45">{section.summary}</span>
            </a>
          ))}
        </nav>
      </section>

      <div className="space-y-5">
        {OFFICIAL_RULEBOOK.map((section, index) => {
          const Icon = iconForSection(index)
          return (
            <article id={section.id} key={section.id} className="scroll-mt-6 rounded-3xl border border-brand-gold/15 bg-black/30 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-gold/20 bg-brand-gold/10 text-brand-gold-light">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-gold/75">{section.summary}</p>
                  <h2 className="mt-1 font-display text-xl font-black italic uppercase tracking-tight text-[#f3edd7] md:text-2xl">{section.title}</h2>
                </div>
              </div>
              <div className="my-5 h-px bg-gradient-to-r from-brand-gold/25 via-brand-gold/10 to-transparent" />
              <div className="space-y-4 text-base leading-relaxed text-[#f3edd7]/75 md:text-lg">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.025] p-4 pl-9 marker:text-brand-gold md:p-5 md:pl-10">
                    {section.bullets.map((bullet) => <li key={bullet} className="pl-1">{bullet}</li>)}
                  </ul>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <footer className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-brand-gold/20 bg-brand-gold/10 p-6 text-center sm:flex-row sm:text-left md:p-8">
        <div>
          <p className="font-display text-xl font-black italic uppercase text-brand-gold-light">Juega con claridad</p>
          <p className="mt-1 text-sm text-slate-400">Las reglas del producto y los términos legales deben leerse conjuntamente.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
          <Link href="/terms" className="inline-flex items-center gap-2 rounded-lg border border-brand-gold/30 px-4 py-3 text-xs font-black uppercase tracking-wider text-brand-gold-light transition-colors hover:bg-brand-gold/15">Términos</Link>
          <Link href="/register/player" className="inline-flex items-center gap-2 rounded-lg bg-accent-gold-shimmer px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition-transform hover:-translate-y-0.5">Únete al Club <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </footer>
    </main>
  )
}
