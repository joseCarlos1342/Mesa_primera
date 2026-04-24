'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import Script from 'next/script'
import { getPublicTurnstileSiteKey } from '@/lib/security/turnstile-env'

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

export function TurnstileWidget() {
  const siteKey = useMemo(() => getPublicTurnstileSiteKey(), [])
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptFailed, setScriptFailed] = useState(false)

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      size: 'flexible',
      language: 'es',
      'response-field-name': 'cf-turnstile-response',
    })
  }, [siteKey])

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

  if (!siteKey || scriptFailed) {
    return (
      <p className="text-red-400 text-xs font-bold text-center" role="alert">
        No se pudo cargar la verificación de seguridad. Recarga la página e intenta de nuevo.
      </p>
    )
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          renderWidget()
        }}
        onError={() => {
          setScriptFailed(true)
        }}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  )
}
