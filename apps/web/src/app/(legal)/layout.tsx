import type { Metadata } from 'next'
import { PageNav } from '@/components/landing/PageNav'
import { LandingFooter } from '@/components/landing/sections/ClosingFooter'
import { LOCAL_LOCATION } from '@/components/landing/landingLocation'

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

/** Documentos legales con la línea de la landing: barra pública, paño en la cabecera y pie del club. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0a0a0a] font-sans text-text-premium selection:bg-brand-gold/35 selection:text-text-premium [overflow-wrap:anywhere]">
      <PageNav />
      <main id="contenido-principal">{children}</main>
      <LandingFooter address={LOCAL_LOCATION.address} />
    </div>
  )
}
