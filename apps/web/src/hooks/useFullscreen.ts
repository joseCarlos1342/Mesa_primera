'use client'

import { useState, useCallback, useEffect, type RefObject } from 'react'

/**
 * Maneja el estado de pantalla completa del navegador.
 *
 * @param targetRef Opcional. Si se provee, el fullscreen apunta a ese elemento
 * en lugar de a `document.documentElement`. Útil para enfocar solo un componente
 * (por ejemplo, la mesa del replay) sin meter en fullscreen toda la app.
 */
export function useFullscreen(targetRef?: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const el = (targetRef?.current ?? document.documentElement) as any
        if (el?.requestFullscreen) {
          await el.requestFullscreen({ navigationUI: 'hide' })
        } else if (el?.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen()
        }
      } else {
        const doc = document as any
        if (doc.exitFullscreen) {
          await doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen()
        }
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, [targetRef])

  const isSupported = typeof document !== 'undefined' && (
    !!document.documentElement.requestFullscreen ||
    !!(document.documentElement as any).webkitRequestFullscreen
  )

  return { isFullscreen, toggle, isSupported }
}
