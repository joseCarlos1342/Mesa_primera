'use client'

import { usePresence } from "@/hooks/usePresence"

const EMPTY_ARRAY: any[] = [];

export function PresenceTracker() {
  // We call it with an empty array to just track the current user
  // without needing a list of friends to observe.
  usePresence(EMPTY_ARRAY)
  
  return null
}
