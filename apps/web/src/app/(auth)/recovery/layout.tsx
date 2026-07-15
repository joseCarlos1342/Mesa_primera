import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recuperar clave — Primera Riverada los 4 Ases',
  description:
    'Recupera tu clave de acceso a Primera Riverada los 4 Ases de forma segura mediante un código SMS.',
  alternates: {
    canonical: 'https://primerariveradalos4ases.com/recovery',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Recuperar clave — Primera Riverada los 4 Ases',
    description:
      'Recupera tu clave de acceso a Primera Riverada los 4 Ases de forma segura mediante un código SMS.',
    url: 'https://primerariveradalos4ases.com/recovery',
    type: 'website',
    locale: 'es_CO',
    images: [
      {
        url: '/og-image',
        width: 1200,
        height: 630,
        alt: 'Recuperar clave — Primera Riverada los 4 Ases',
      },
    ],
  },
}

export default function RecoveryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
