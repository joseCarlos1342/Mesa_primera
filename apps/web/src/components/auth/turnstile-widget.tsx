'use client'

import { useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>,
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export function TurnstileWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: 'dark',
      size: 'flexible',
      language: 'es',
      'response-field-name': 'cf-turnstile-response',
    })
  }, [])

  useEffect(() => {
    // If turnstile script already loaded (e.g. back-forward cache)
    if (window.turnstile && containerRef.current && !widgetIdRef.current) {
      renderWidget()
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [renderWidget])

  if (!SITE_KEY) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          window.onTurnstileLoad = renderWidget
          // If script loaded before onReady fires
          renderWidget()
        }}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  )
}
