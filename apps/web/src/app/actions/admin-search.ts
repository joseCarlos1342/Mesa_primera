'use server'

import { createClient } from '@/utils/supabase/server'
import { logAdminAction } from './admin-audit'
import { detectIdentifier } from '@/lib/detect-identifier'
import { z } from 'zod'
import type {
  SearchMatch,
  AdminSearchReport,
  ActionResult,
} from '@/types/admin-search'

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
const globalSearchSchema = z.string().trim().min(2, 'Ingresa al menos 2 caracteres').max(64, 'La consulta no puede superar 64 caracteres')

async function searchAdminReplays(
  supabase: Awaited<ReturnType<typeof createClient>>,
  identifier: string,
): Promise<SearchMatch[]> {
  const { data, error } = await supabase.rpc('search_admin_replays', { p_identifier: identifier }) as {
    data: Array<{ id: string; game_id: string; created_at: string }> | null
    error: { message: string } | null
  }
  if (error) throw new Error(error.message)
  return (data || []).map((row) => ({
    entity: 'replay' as const,
    id: row.id,
    target_id: row.game_id,
    label: `Replay: ${row.game_id}`,
    detail: row.created_at,
  }))
}

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
    searchAdminReplays(supabase, uuid),
    supabase.from('support_tickets').select('id, user_id, status, created_at')
      .or(`id.eq.${uuid},user_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
    supabase.from('server_alerts').select('id, title, severity, category, game_id, player_id, created_at')
      .or(`id.eq.${uuid},game_id.eq.${uuid},player_id.eq.${uuid}`)
      .limit(SEARCH_LIMIT),
  ])

  const failure = [ledger, deposits, withdrawals, tickets, alerts].find((result) => result.error)?.error
  if (failure) throw new Error(failure.message)

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

  matches.push(...replays)

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

  return searchAdminReplays(supabase, seed)
}

async function searchByUsername(
  supabase: Awaited<ReturnType<typeof createClient>>,
  username: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = []

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, role')
    .or(`username.ilike.%${username}%,full_name.ilike.%${username}%`)
    .limit(SEARCH_LIMIT)

  if (error) throw new Error(error.message)

  const profileRows = profiles || []
  for (const row of profileRows) {
    matches.push({
      entity: 'user',
      id: row.id,
      label: `${row.full_name || row.username || 'Sin nombre'} (${row.role})`,
      detail: row.username ? `@${row.username}` : null,
    })
  }

  const userIds = profileRows.map((profile) => profile.id)
  if (userIds.length === 0) return matches

  const [ticketResult, alertResult] = await Promise.all([
    supabase.from('support_tickets').select('id, status, created_at').in('user_id', userIds).limit(SEARCH_LIMIT),
    supabase.from('server_alerts').select('id, title, severity, created_at').in('player_id', userIds).limit(SEARCH_LIMIT),
  ])
  if (ticketResult.error) throw new Error(ticketResult.error.message)
  if (alertResult.error) throw new Error(alertResult.error.message)

  for (const row of ticketResult.data || []) {
    matches.push({ entity: 'ticket', id: row.id, label: `Ticket: ${row.status}`, detail: row.created_at })
  }
  for (const row of alertResult.data || []) {
    matches.push({ entity: 'alert', id: row.id, label: `Alerta: [${row.severity}] ${row.title}`, detail: row.created_at })
  }

  const ticketIds = (ticketResult.data || []).map((ticket) => ticket.id)
  if (ticketIds.length === 0) return matches

  const { data: disputes, error: disputeError } = await supabase
    .from('admin_dispute_cases')
    .select('id, title, status, created_at')
    .in('support_ticket_id', ticketIds)
    .limit(SEARCH_LIMIT)
  if (disputeError) throw new Error(disputeError.message)

  for (const row of disputes || []) {
    matches.push({ entity: 'dispute', id: row.id, label: `Disputa: ${row.title} (${row.status})`, detail: row.created_at })
  }

  return matches
}

// ─── Global Search ──────────────────────────────────────────

export async function globalSearch(query: string): Promise<ActionResult<AdminSearchReport>> {
  if (!query.trim()) return { error: 'Consulta vacía' }
  const parsedQuery = globalSearchSchema.safeParse(query)
  if (!parsedQuery.success) return { error: parsedQuery.error.issues[0]?.message || 'Consulta inválida' }

  const { supabase, adminId, error: authError } = await verifyAdmin()
  if (authError || !supabase || !adminId) return { error: authError || 'No autenticado' }

  const normalizedQuery = parsedQuery.data
  const detected = detectIdentifier(normalizedQuery)
  if (!detected.normalized) return { error: 'Consulta inválida' }

  let matches: SearchMatch[] = []

  try {
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
        {
          const [uuidMatches, seedMatches, usernameMatches] = await Promise.all([
            searchByUuid(supabase, detected.normalized),
            searchBySeed(supabase, detected.normalized),
            searchByUsername(supabase, detected.normalized),
          ])
          matches = [...uuidMatches, ...seedMatches, ...usernameMatches]
        }
        break
    }
  } catch {
    await logAdminAction(adminId, 'global_search_failed', 'search', normalizedQuery, {
      detected_type: detected.type,
    })
    return { error: 'No fue posible completar la consulta. Inténtalo de nuevo.' }
  }

  // Audit log
  await logAdminAction(adminId, 'global_search', 'search', normalizedQuery, {
    detected_type: detected.type,
    match_count: matches.length,
  })

  return {
    data: {
      query: normalizedQuery,
      detected,
      matches,
      searched_at: new Date().toISOString(),
    },
  }
}
