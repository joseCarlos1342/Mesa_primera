"use client"

import { useEffect, useState, useCallback, useRef } from 'react'

export type PermissionStatus = 'pending' | 'granted' | 'denied' | 'unavailable'

export interface GamePermissions {
  orientation: PermissionStatus
  notifications: PermissionStatus
  microphone: PermissionStatus
  isMobile: boolean
  allGranted: boolean
  requestAll: () => Promise<void>
}

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>
}

function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.matchMedia('(max-width: 1024px)').matches)
}

export function useGamePermissions(): GamePermissions {
  const isMobile = typeof window !== 'undefined' ? getIsMobile() : false
  const screenOrientation = typeof window !== 'undefined'
    ? (window.screen.orientation as ScreenOrientationWithLock | undefined)
    : undefined
  const [orientation, setOrientation] = useState<PermissionStatus>(isMobile ? 'pending' : 'unavailable')
  const [notifications, setNotifications] = useState<PermissionStatus>('pending')
  const [microphone, setMicrophone] = useState<PermissionStatus>('pending')
  const hasChecked = useRef(false)

  // Check initial states
  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true

    // Notifications: check current state
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotifications('granted')
      else if (Notification.permission === 'denied') setNotifications('denied')
    } else {
      setNotifications('unavailable')
    }

    // Microphone: query permission state
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then(result => {
        if (result.state === 'granted') setMicrophone('granted')
        else if (result.state === 'denied') setMicrophone('denied')
        result.addEventListener('change', () => {
          setMicrophone(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'pending')
        })
      }).catch(() => {
        // permissions.query not supported for microphone in some browsers
      })
    }

    // Orientation lock: check support
    if (isMobile && screenOrientation?.lock) {
      setOrientation('pending')
    } else if (isMobile) {
      // API not supported, we'll still try
      setOrientation('pending')
    }
  }, [isMobile, screenOrientation])

  const requestAll = useCallback(async () => {
    // 1. Screen orientation lock (mobile only)
    if (isMobile) {
      try {
        if (screenOrientation?.lock) {
          await screenOrientation.lock('landscape')
          setOrientation('granted')
        } else {
          setOrientation('unavailable')
        }
      } catch (err: any) {
        // Some browsers require fullscreen first
        if (err.name === 'SecurityError' || err.name === 'NotSupportedError') {
          try {
            await document.documentElement.requestFullscreen()
            await screenOrientation?.lock?.('landscape')
            setOrientation('granted')
          } catch {
            // Can't lock orientation - the portrait overlay will still show as fallback
            setOrientation('unavailable')
          }
        } else {
          setOrientation('unavailable')
        }
      }
    }

    // 2. Notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const result = await Notification.requestPermission()
        setNotifications(result === 'granted' ? 'granted' : 'denied')
      } catch {
        setNotifications('denied')
      }
    }

    // 3. Microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicrophone('granted')
    } catch {
      setMicrophone('denied')
    }
  }, [isMobile, screenOrientation])

  const allGranted =
    (orientation === 'granted' || orientation === 'unavailable') &&
    (notifications === 'granted' || notifications === 'denied' || notifications === 'unavailable') &&
    (microphone === 'granted' || microphone === 'denied' || microphone === 'unavailable')

  return { orientation, notifications, microphone, isMobile, allGranted, requestAll }
}
