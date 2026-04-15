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
  entity: 'ledger' | 'deposit' | 'withdrawal' | 'replay' | 'user' | 'ticket' | 'alert'
  id: string
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

export interface AdminDisputeCase {
  id: string
  status: DisputeStatus
  priority: DisputePriority
  title: string
  description: string
  /** Admin who opened the case */
  opened_by: string
  /** Admin currently assigned */
  assigned_to: string | null
  /** Optional link to a support ticket */
  support_ticket_id: string | null
  /** Snapshot of evidence IDs at creation */
  evidence_snapshot: EvidenceLink[]
  resolution_notes: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

export interface EvidenceLink {
  entity: SearchMatch['entity']
  entity_id: string
  label: string
}

// ─── Action Results ─────────────────────────────────────────

export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string }
