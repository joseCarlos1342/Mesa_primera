import type { DetectedIdentifier } from '@/types/admin-search'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEX_SEED_RE = /^[0-9a-f]{32,64}$/i
const SAFE_USERNAME_RE = /^[\p{L}\p{N}][\p{L}\p{N}_. -]{1,39}$/u

export function detectIdentifier(raw: string): DetectedIdentifier {
  const trimmed = raw.trim()
  if (!trimmed) return { raw, type: 'unknown', normalized: '' }

  if (UUID_RE.test(trimmed)) {
    return { raw, type: 'uuid', normalized: trimmed.toLowerCase() }
  }

  // Hex seeds (32-64 chars, not a UUID — already ruled out above)
  if (HEX_SEED_RE.test(trimmed)) {
    return { raw, type: 'seed', normalized: trimmed.toLowerCase() }
  }

  // Username (with or without @)
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (!SAFE_USERNAME_RE.test(username)) {
    return { raw, type: 'unknown', normalized: '' }
  }

  return { raw, type: 'username', normalized: username.toLowerCase() }
}
