/**
 * Tipos para el pipeline de renderizado de MP4 a partir de replays JSON.
 *
 * Ciclo de vida del artefacto:
 *   pending → processing → ready | failed
 *
 * El worker consume trabajos de BullMQ, abre la vista interna de render
 * en un navegador headless, captura la reproducción y produce un MP4.
 */

/** Estado del artefacto MP4 en el ciclo de vida de renderizado. */
export type Mp4RenderStatus = 'pending' | 'processing' | 'ready' | 'failed';

/** Datos del trabajo de renderizado encolado en BullMQ. */
export interface RenderJobData {
  gameId: string;
  /** Ruta relativa al JSON (ej. "2026-04/game-001.json") */
  replayPath: string;
  /** Timestamp ISO del replay para calcular la carpeta mensual */
  createdAt: string;
}

/** Resultado devuelto por el worker al completar un render. */
export interface RenderJobResult {
  status: 'ready' | 'failed';
  /** Ruta absoluta al MP4 generado */
  mp4Path?: string;
  /** Tamaño en bytes del MP4 */
  sizeBytes?: number;
  /** Duración en milisegundos del video */
  durationMs?: number;
  /** Razón del fallo si status === 'failed' */
  errorReason?: string;
}

/** Metadatos del MP4 almacenados junto al replay (Supabase o sidecar). */
export interface Mp4Metadata {
  status: Mp4RenderStatus;
  path: string | null;
  mime: 'video/mp4';
  sizeBytes: number | null;
  durationMs: number | null;
  renderedAt: string | null;
  errorReason: string | null;
}
