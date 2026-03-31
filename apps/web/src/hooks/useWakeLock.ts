"use client"

import { useEffect, useRef } from 'react'

type WakeLockSentinelLike = {
  release: () => Promise<void>
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>
  }
}

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    const navigatorWithWakeLock = navigator as NavigatorWithWakeLock

    const requestWakeLock = async () => {
      try {
        if (!navigatorWithWakeLock.wakeLock) {
          return
        }

        wakeLockRef.current = await navigatorWithWakeLock.wakeLock.request('screen')
      } catch (error) {
        console.warn('Wake Lock error:', error)
      }
    }

    void requestWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (wakeLockRef.current) {
        void wakeLockRef.current.release().finally(() => {
          wakeLockRef.current = null
        })
      }
    }
  }, [])
}