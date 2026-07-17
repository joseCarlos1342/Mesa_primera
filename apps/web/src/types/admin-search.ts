// ─── Admin Search & Disputes — Shared Types ────────────────

// ─── Identifier Detection ───────────────────────────────────

export type IdentifierType = 'uuid' | 'seed' | 'username' | 'unknown'

export interface DetectedIdentifier {
  raw: string
  type: IdentifierType
  normalized: string
}

// ─── Search Report ──────────────────────────────────────────

export interface SearchMatch {
  entity: 'ledger' | 'deposit' | 'withdrawal' | 'replay' | 'user' | 'ticket' | 'alert' | 'dispute'
  id: string
  /** Identificador que requiere la ruta de destino cuando difiere de la clave primaria. */
  target_id?: string
  label: string
  /** Secondary info (e.g. amount, date, user) */
  detail: string | null
}

export interface AdminSearchReport {
  query: string
  detected: DetectedIdentifier
  matches: SearchMatch[]
  searched_at: string
}

// ─── Dispute Case ───────────────────────────────────────────

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'dismissed'
export type DisputePriority = 'low' | 'medium' | 'high' | 'critical'
export type InvestigationType = 'game_integrity' | 'collusion' | 'fraud' | 'bonus_abuse' | 'conduct'
export type InvestigationSource = 'manual' | 'global_search' | 'server_alert' | 'replay'
export type InvestigationOutcome = 'no_action' | 'warning' | 'sanction' | 'compensation'

export interface AdminDisputeCase {
  id: string
  status: DisputeStatus
  priority: DisputePriority
  investigation_type: InvestigationType
  source: InvestigationSource
  title: string
  description: string
  /** Admin who opened the case */
  opened_by: string
  /** Admin currently assigned */
  assigned_to: string | null
  /** Optional link to a support ticket */
  support_ticket_id: string | null
  subject_user_ids: string[]
  game_id: string | null
  room_id: string | null
  /** Snapshot of evidence IDs at creation */
  evidence_snapshot: EvidenceLink[]
  resolution_notes: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolution_outcome?: InvestigationOutcome | null
  compensation_user_id?: string | null
  compensation_amount_cents?: number | null
  compensation_reason?: string | null
  compensation_status?: 'proposed' | 'approved' | null
  compensation_ledger_id?: string | null
  created_at: string
  updated_at: string
}

export interface EvidenceLink {
  entity: SearchMatch['entity']
  entity_id: string
  label: string
  target_id?: string
}

// ─── Action Results ─────────────────────────────────────────

export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string }
