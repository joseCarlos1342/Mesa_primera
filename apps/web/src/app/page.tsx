import type { Metadata } from 'next'
import { LandingContent } from '@/components/landing/LandingContent'

export const metadata: Metadata = {
  title: 'Primera Riverada los 4 Ases | Club en Neiva',
  description:
    'Club de cartas Primera, dominó y entretenimiento en Neiva, Huila. Juega online en tiempo real o visítanos con amigos.',
  alternates: { canonical: 'https://primerariveradalos4ases.com/' },
  openGraph: {
    title: 'Primera Riverada los 4 Ases | Club en Neiva',
    description:
      'Club de cartas Primera, dominó y entretenimiento en Neiva, Huila. Juega online en tiempo real o visítanos con amigos.',
    url: 'https://primerariveradalos4ases.com/',
    siteName: 'Primera Riverada los 4 Ases',
    type: 'website',
    locale: 'es_CO',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Primera Riverada los 4 Ases, club de cartas en Neiva' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@primerariverada',
    title: 'Primera Riverada los 4 Ases | Club en Neiva',
    description: 'Club de cartas Primera, dominó y entretenimiento en Neiva. Juega online o visítanos con amigos.',
    images: ['/og-image.png'],
  },
}

export default function LandingPage() {
  return <LandingContent />
}
