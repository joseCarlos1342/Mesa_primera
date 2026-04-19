"use client"

import { useEffect, useState, useCallback, useRef } from 'react'

export type PermissionStatus = 'pending' | 'granted' | 'denied' | 'unavailable'

export interface GamePermissions {
  notifications: PermissionStatus
  microphone: PermissionStatus
  isMobile: boolean
  allGranted: boolean
  requestAll: () => Promise<void>
}

function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.matchMedia('(max-width: 1024px)').matches)
}

export function useGamePermissions(): GamePermissions {
  const isMobile = typeof window !== 'undefined' ? getIsMobile() : false
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

    // Microphone: unavailable in insecure contexts (HTTP over IP)
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setMicrophone('unavailable')
      return
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
  }, [])

  const requestAll = useCallback(async () => {
    // 1. Notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const result = await Notification.requestPermission()
        setNotifications(result === 'granted' ? 'granted' : 'denied')
      } catch {
        setNotifications('denied')
      }
    }

    // 2. Microphone permission — skip in insecure contexts
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMicrophone('unavailable')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicrophone('granted')
    } catch {
      setMicrophone('denied')
    }
  }, [])

  const allGranted =
    (notifications === 'granted' || notifications === 'denied' || notifications === 'unavailable') &&
    (microphone === 'granted' || microphone === 'denied' || microphone === 'unavailable')

  return { notifications, microphone, isMobile, allGranted, requestAll }
}
