'use client'

import { useCallback, useEffect } from 'react'
import { LOCAL_LOCATION } from '@/components/landing/landingLocation'
import { LandingNav } from './LandingNav'
import { DeckBoard } from './sections/DeckBoard'
import { StartSteps } from './sections/StartSteps'
import { ClubSection } from './sections/ClubSection'
import { TutorialsSection } from './sections/TutorialsSection'
import { FaqSection, LocationSection } from './sections/FaqLocation'
import { ClosingTable, LandingFooter } from './sections/ClosingFooter'

const PAGE_BACKGROUND = '#0a0a0a'

export function LandingContent() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousHtml = html.style.backgroundColor
    const previousBody = body.style.backgroundColor
    html.style.backgroundColor = PAGE_BACKGROUND
    body.style.backgroundColor = PAGE_BACKGROUND
    return () => {
      html.style.backgroundColor = previousHtml
      body.style.backgroundColor = previousBody
    }
  }, [])

  const showInstallTutorial = useCallback(() => {
    document.getElementById('instalar-app')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return (
    <div className="landing-layout relative min-h-screen overflow-x-clip bg-[#0a0a0a] font-sans text-text-premium selection:bg-brand-gold/35 selection:text-text-premium">
      <LandingNav />
      <main id="contenido-principal">
        <DeckBoard onInstallHint={showInstallTutorial} />
        <StartSteps />
        <ClubSection address={LOCAL_LOCATION.address} />
        <TutorialsSection />
        <FaqSection />
        <LocationSection />
        <ClosingTable />
      </main>
      <LandingFooter address={LOCAL_LOCATION.address} />
    </div>
  )
}
