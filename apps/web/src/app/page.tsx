import type { Metadata } from 'next'
import { LandingContent } from '@/components/landing/LandingContent'

export const metadata: Metadata = {
  title: 'Primera Riverada los 4 Ases | Club de Cartas, Dominó y Entretenimiento en Neiva',
  description:
    'Primera Riverada los 4 Ases — club presencial y online de juego de cartas Primera, dominó, bebidas y parqueo en Neiva, Huila. Mesa de juego Dario, tomadero con juegos de azar. Juega en tiempo real con amigos.',
  alternates: { canonical: '/' },
  keywords: [
    'primera riverada los 4 ases',
    'primera riverada',
    'primera riverada neiva',
    'los 4 ases',
    'los 4 ases neiva',
    'los 3 ases',
    'los tres ases',
    'mesa de juego Dario',
    'tomadero neiva',
    'tomadero con juegos de azar',
    'juego de primera',
    'juego de cartas primera',
    'club de cartas colombia',
    'club de cartas neiva',
    'domino neiva',
    'domino colombia',
    'jugar primera online',
    'cartas multijugador',
    'juegos de azar neiva',
    'juegos de mesa neiva huila',
    'entretenimiento neiva',
    'mesa primera',
  ],
  openGraph: {
    title: 'Primera Riverada los 4 Ases | Club de Cartas y Entretenimiento en Neiva',
    description:
      'Club presencial y online de juego de cartas Primera, dominó, bebidas y parqueo en Neiva, Huila. Mesa de juego Dario. Juega en tiempo real con amigos.',
    url: 'https://primerariveradalos4ases.com',
    type: 'website',
    locale: 'es_CO',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Primera Riverada los 4 Ases — Club de Cartas en Neiva' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Primera Riverada los 4 Ases | Club de Cartas en Neiva',
    description: 'Juega Primera online o visítanos en Neiva. Club de cartas, dominó, tomadero y entretenimiento.',
    images: ['/og-image.png'],
  },
}

export default function LandingPage() {
  return <LandingContent />
}
