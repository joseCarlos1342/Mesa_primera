import type { Metadata } from 'next'
import { LandingContent } from '@/components/landing/LandingContent'

export const metadata: Metadata = {
  title: 'Primera Riverada los 4 Ases | Club de Cartas y Domino en Colombia',
  description:
    'Mesa Primera — club presencial y online de juego de cartas Primera, domino, bebidas y parqueo. Juega en tiempo real con amigos. También conocido como los 3 Ases o Riverada.',
  alternates: { canonical: '/' },
  keywords: [
    'mesa primera',
    'primera riverada los 4 ases',
    'primera riverada',
    'riverada los 4 ases',
    'los 3 ases',
    'los tres ases',
    'juego de primera',
    'juego de cartas primera',
    'club de cartas colombia',
    'domino colombia',
    'jugar primera online',
    'cartas multijugador',
  ],
  openGraph: {
    title: 'Primera Riverada los 4 Ases | Club de Cartas y Domino',
    description:
      'Club presencial y online de juego de cartas Primera, domino, bebidas y parqueo. Juega en tiempo real con amigos.',
    url: 'https://primerariveradalos4ases.com',
    type: 'website',
    locale: 'es_CO',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Primera Riverada los 4 Ases' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Primera Riverada los 4 Ases | Club de Cartas',
    description: 'Juega Primera online o visítanos en persona. Club de cartas, domino y más.',
    images: ['/og-image.png'],
  },
}

export default function LandingPage() {
  return <LandingContent />
}
