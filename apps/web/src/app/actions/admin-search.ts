'use server'

import { createClient } from '@/utils/supabase/server'
import { logAdminAction } from './admin-audit'
import type {
  DetectedIdentifier,
  IdentifierType,
  SearchMatch,
  AdminSearchReport,
  ActionResult,
} from '@/types/admin-search'

// ─── Identifier Detection (pure, exported for tests) ────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEX_SEED_RE = /^[0-9a-f]{32,64}$/i

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
  return { raw, type: 'username', normalized: username.toLowerCase() }
}

// ─── Auth ───────────────────────────────────────────────────

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return { supabase: null, adminId: null, error: 'No autenticado' } as const

  const { data: userRecord } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (userRecord?.role !== 'admin') return { supabase: null, adminId: null, error: 'Acceso denegado' } as const
  return { supabase, adminId: userData.user.id, error: null } as const
}

// ─── Search Strategies ──────────────────────────────────────

const SEARCH_LIMIT = 10

async function searchByUuid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  uuid: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = []

  // Search in parallel: ledger, deposit_requests, withdrawal_requests, game_replays, support_tickets, server_alerts
  const [ledger, deposits, withdrawals, replays, tickets, alerts] = await Promise.all([
    supabase.from('ledger').select('id, user_id, type, direction, amount_cents, created_at')
      .or(`id.eq.${uuid},reference_id.eq.${uuid},game_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
    supabase.from('deposit_requests').select('id, user_id, amount_cents, status, created_at')
      .or(`id.eq.${uuid},user_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
    supabase.from('withdrawal_requests').select('id, user_id, amount_cents, status, created_at')
      .or(`id.eq.${uuid},user_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
    supabase.from('game_replays').select('id, game_id, rng_seed, created_at')
      .or(`id.eq.${uuid},game_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
    supabase.from('support_tickets').select('id, user_id, status, created_at')
      .or(`id.eq.${uuid},user_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
    supabase.from('server_alerts').select('id, title, severity, category, game_id, player_id, created_at')
      .or(`id.eq.${uuid},game_id.eq.${uuid},player_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
  ])

  for (const row of ledger.data || []) {
    matches.push({
      entity: 'ledger',
      id: row.id,
      label: `Ledger: ${row.type} ${row.direction} $${(row.amount_cents / 100).toFixed(0)}`,
      detail: row.created_at,
    })
  }

  for (const row of deposits.data || []) {
    matches.push({
      entity: 'deposit',
      id: row.id,
      label: `Depósito: $${(row.amount_cents / 100).toFixed(0)} (${row.status})`,
      detail: row.created_at,
    })
  }

  for (const row of withdrawals.data || []) {
    matches.push({
      entity: 'withdrawal',
      id: row.id,
      label: `Retiro: $${(row.amount_cents / 100).toFixed(0)} (${row.status})`,
      detail: row.created_at,
    })
  }

  for (const row of replays.data || []) {
    matches.push({
      entity: 'replay',
      id: row.id,
      label: `Replay: ${row.game_id}`,
      detail: row.created_at,
    })
  }

  for (const row of tickets.data || []) {
    matches.push({
      entity: 'ticket',
      id: row.id,
      label: `Ticket: ${row.status}`,
      detail: row.created_at,
    })
  }

  for (const row of alerts.data || []) {
    matches.push({
      entity: 'alert',
      id: row.id,
      label: `Alerta: [${row.severity}] ${row.title}`,
      detail: row.created_at,
    })
  }

  return matches
}

async function searchBySeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seed: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = []

  const { data: replays } = await supabase
    .from('game_replays')
    .select('id, game_id, rng_seed, created_at')
    .eq('rng_seed', seed)
    .limit(SEARCH_LIMIT)

  for (const row of replays || []) {
    matches.push({
      entity: 'replay',
      id: row.id,
      label: `Replay: ${row.game_id}`,
      detail: row.created_at,
    })
  }

  return matches
}

async function searchByUsername(
  supabase: Awaited<ReturnType<typeof createClient>>,
  username: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, username, role')
    .or(`username.ilike.%${username}%,full_name.ilike.%${username}%`)
    .limit(SEARCH_LIMIT)

  for (const row of profiles || []) {
    matches.push({
      entity: 'user',
      id: row.id,
      label: `${row.full_name || row.username || 'Sin nombre'} (${row.role})`,
      detail: row.username ? `@${row.username}` : null,
    })
  }

  return matches
}

// ─── Global Search ──────────────────────────────────────────

export async function globalSearch(query: string): Promise<ActionResult<AdminSearchReport>> {
  if (!query.trim()) return { error: 'Consulta vacía' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const detected = detectIdentifier(query)

  let matches: SearchMatch[] = []

  switch (detected.type) {
    case 'uuid':
      matches = await searchByUuid(supabase, detected.normalized)
      break
    case 'seed':
      matches = await searchBySeed(supabase, detected.normalized)
      break
    case 'username':
      matches = await searchByUsername(supabase, detected.normalized)
      break
    case 'unknown':
      // Try all strategies
      const [uuidMatches, seedMatches, usernameMatches] = await Promise.all([
        searchByUuid(supabase, detected.normalized),
        searchBySeed(supabase, detected.normalized),
        searchByUsername(supabase, detected.normalized),
      ])
      matches = [...uuidMatches, ...seedMatches, ...usernameMatches]
      break
  }

  // Audit log
  await logAdminAction(adminId, 'global_search', 'search', query, {
    detected_type: detected.type,
    match_count: matches.length,
  })

  return {
    data: {
      query,
      detected,
      matches,
      searched_at: new Date().toISOString(),
    },
  }
}
