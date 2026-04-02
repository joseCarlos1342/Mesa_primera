'use client'

import { useState, useCallback, useEffect } from 'react'

export function useFullscreen() {
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
        const el = document.documentElement as any
        if (el.requestFullscreen) {
          await el.requestFullscreen({ navigationUI: 'hide' })
        } else if (el.webkitRequestFullscreen) {
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
  }, [])

  const isSupported = typeof document !== 'undefined' && (
    !!document.documentElement.requestFullscreen ||
    !!(document.documentElement as any).webkitRequestFullscreen
  )

  return { isFullscreen, toggle, isSupported }
}
