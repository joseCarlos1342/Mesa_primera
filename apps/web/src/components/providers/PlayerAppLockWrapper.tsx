'use client'

import { AppLockProvider } from '@/components/providers/AppLockProvider'
import type { ReactNode } from 'react'

export function PlayerAppLockWrapper({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  return (
    <AppLockProvider userId={userId}>
      {children}
    </AppLockProvider>
  )
}
