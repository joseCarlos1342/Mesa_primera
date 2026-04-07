"use client"

import { useEffect } from "react"

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>
  unlock?: () => void
}

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    ("ontouchstart" in window &&
      window.matchMedia("(max-width: 1024px)").matches)
  )
}

/**
 * Desbloquea la orientación landscape del juego y restaura portrait/natural
 * cuando el jugador vuelve al lobby, home, wallet, etc.
 */
export function OrientationPortrait() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!getIsMobile()) return

    const orientation = window.screen.orientation as
      | ScreenOrientationWithLock
      | undefined

    // Unlock landscape lock from the game
    try {
      orientation?.unlock?.()
    } catch {
      // unlock not supported
    }

    // Exit fullscreen if active (game may have entered fullscreen for orientation lock)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  return null
}
