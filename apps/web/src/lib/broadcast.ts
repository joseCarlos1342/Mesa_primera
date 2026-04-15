/**
 * Broadcast system contract — shared types for admin UI, inbox, Socket.IO, and Web Push.
 *
 * The four notification types used by admin broadcast:
 *   - system_announcement: Announcements about the platform.
 *   - maintenance:         Scheduled downtime or maintenance.
 *   - promo:               Promotions, bonuses, special events.
 *   - security:            Security alerts.
 */

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------

/** Broadcast categories available in admin UI */
export const BROADCAST_TYPES = [
  'system_announcement',
  'maintenance',
  'promo',
  'security',
] as const;

export type BroadcastType = (typeof BROADCAST_TYPES)[number];

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/** Payload sent from admin UI when creating a broadcast */
export interface BroadcastInput {
  title: string;
  body: string;
  type: BroadcastType;
}

/** Row persisted in `broadcast_messages` (audit root) */
export interface BroadcastMessage {
  id: string;
  admin_id: string;
  type: BroadcastType;
  title: string;
  body: string;
  audience_count: number;
  created_at: string;
}

/** Per-user delivery record in `broadcast_deliveries` */
export interface BroadcastDelivery {
  id: string;
  broadcast_id: string;
  user_id: string;
  notification_id: string | null;
  /** In-app delivery timestamp (insert in notifications) */
  in_app_sent_at: string;
  /** Push queued timestamp */
  push_queued_at: string | null;
  /** Push successfully sent to push service */
  push_sent_at: string | null;
  /** Push delivery failed */
  push_failed_at: string | null;
  /** Last error message for failed push */
  push_error: string | null;
}

/** Notification row as returned from `notifications` table */
export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  created_at: string;
  /** null = unread; ISO timestamp = read at that time */
  read_at: string | null;
  /** Optional foreign key to broadcast_messages for broadcast notifications */
  broadcast_id?: string | null;
}

/** Socket.IO event payload for `/notifications` namespace */
export interface SocketBroadcastEvent {
  broadcastId: string;
  type: BroadcastType;
  title: string;
  body: string;
  createdAt: string;
}

/** Result returned by the broadcast orchestrator */
export interface BroadcastResult {
  success: boolean;
  broadcastId: string;
  audienceCount: number;
}
