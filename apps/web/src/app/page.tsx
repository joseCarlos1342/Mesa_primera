import type { Metadata } from 'next'
import { LandingContent } from '@/components/landing/LandingContent'

export const metadata: Metadata = {
  title: 'Primera Riverada los 4 Ases | Club de Cartas, Dominó y Entretenimiento en Neiva',
  description:
    'Primera Riverada los 4 Ases — club presencial y online de juego de cartas Primera, dominó, bebidas y parqueo en Neiva, Huila. Mesa de juego Dario, tomadero con juegos de azar. Juega Primera Riverada online en tiempo real con amigos. Primera Riverada Neiva, Primera Riverada Dario.',
  alternates: { canonical: 'https://primerariveradalos4ases.com/' },
  keywords: [
    'primera riverada los 4 ases',
    'primera riverada',
    'primera riverada neiva',
    'primera riverada dario',
    'primera riverada huila',
    'primera riverada colombia',
    'primera riverda',
    'primera riverda neiva',
    'primera riverda dario',
    'juego de primera riverada',
    'juego de primera riverda',
    'los 4 ases',
    'los 4 ases neiva',
    'los 4 ases huila',
    'los 3 ases',
    'los tres ases',
    'mesa de juego dario',
    'mesa de primera neiva',
    'tomadero neiva',
    'tomadero con juegos de azar',
    'tomadero huila',
    'juego de primera',
    'juego de cartas primera',
    'juego de cartas neiva',
    'club de cartas colombia',
    'club de cartas neiva',
    'club de cartas huila',
    'domino neiva',
    'domino colombia',
    'jugar primera online',
    'jugar primera riverada online',
    'cartas multijugador',
    'juegos de azar neiva',
    'juegos de azar huila',
    'juegos de mesa neiva huila',
    'entretenimiento neiva',
    'entretenimiento huila',
    'mesa primera',
    'primera cartas online',
    'primera neiva',
    'primera huila',
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
