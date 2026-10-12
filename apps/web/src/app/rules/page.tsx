import type { Metadata } from 'next'
import { RulesContent } from '@/components/rules/RulesContent'

export const metadata: Metadata = {
  title: 'Reglas del Juego — Primera Riverada los 4 Ases',
  description:
    'Reglamento oficial de Primera Riverada los 4 Ases: cartas, combinaciones, apuestas, pozos, desempates, rake y reconexión.',
  alternates: { canonical: '/rules' },
  robots: { index: true, follow: true },
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

export default function PublicRulesPage() {
  return <RulesContent />
}
