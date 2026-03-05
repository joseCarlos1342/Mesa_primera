'use client'

import { useEffect, useState } from 'react'

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null)

  useEffect(() => {
    async function getFingerprint() {
      const components = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        touchPoints: navigator.maxTouchPoints,
        colorDepth: window.screen.colorDepth,
        platform: navigator.platform,
      }

      const msgUint8 = new TextEncoder().encode(JSON.stringify(components))
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      setFingerprint(hashHex)
    }

    getFingerprint()
  }, [])

  return fingerprint
}
