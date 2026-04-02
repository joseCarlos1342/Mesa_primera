import * as fs from 'fs';
import * as path from 'path';

/**
 * Estructura de datos de una grabación de partida.
 * Se serializa como JSON en el filesystem del VPS.
 */
export interface ReplayData {
  game_id: string;
  round_number: number;
  rng_seed: string;
  timeline: any[];
  admin_timeline: any[];
  players: any[];
  pot_breakdown: Record<string, any>;
  final_hands: Record<string, any>;
  room_id: string | null;
  table_name: string | null;
  created_at: string;
}

/**
 * Servicio de almacenamiento de grabaciones en el filesystem del VPS.
 *
 * Directorio base: /data/replays/ (en Docker con volumen montado)
 * Fallback local: apps/game-server/replays/ (para desarrollo)
 *
 * Estructura de archivos:
 *   /data/replays/{YYYY-MM}/{gameId}.json
 *
 * Este almacenamiento es la fuente primaria de datos de grabación.
 * Supabase mantiene solo metadatos para consultas y RLS.
 */
export class ReplayFileService {
  private static readonly BASE_DIR = process.env.REPLAY_STORAGE_DIR
    || (process.env.NODE_ENV === 'production' ? '/data/replays' : path.join(process.cwd(), 'replays'));

  private static initialized = false;

  private static ensureDir(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (e: any) {
      console.error(`[ReplayFileService] Cannot create directory ${dirPath}:`, e.message);
      return false;
    }
  }

  private static init() {
    if (this.initialized) return;
    const ok = this.ensureDir(this.BASE_DIR);
    if (ok) {
      console.log(`[ReplayFileService] Storage directory: ${this.BASE_DIR}`);
    }
    this.initialized = true;
  }

  /** Genera la subcarpeta mensual: YYYY-MM */
  private static getMonthDir(isoDate: string): string {
    const d = new Date(isoDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }

  /**
   * Guarda una grabación como archivo JSON en el filesystem.
   * Retorna true si se guardó exitosamente.
   */
  static save(replay: ReplayData): boolean {
    this.init();
    try {
      const monthDir = path.join(this.BASE_DIR, this.getMonthDir(replay.created_at));
      if (!this.ensureDir(monthDir)) return false;

      const filePath = path.join(monthDir, `${replay.game_id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(replay), 'utf-8');
      return true;
    } catch (e: any) {
      console.error(`[ReplayFileService] Error saving replay ${replay.game_id}:`, e.message);
      return false;
    }
  }

  /**
   * Lee una grabación del filesystem por game_id.
   * Busca en todas las subcarpetas mensuales si no se especifica mes.
   */
  static load(gameId: string): ReplayData | null {
    this.init();
    try {
      // Buscar en subcarpetas mensuales (más recientes primero)
      const months = fs.readdirSync(this.BASE_DIR)
        .filter(d => fs.statSync(path.join(this.BASE_DIR, d)).isDirectory())
        .sort()
        .reverse();

      for (const month of months) {
        const filePath = path.join(this.BASE_DIR, month, `${gameId}.json`);
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          return JSON.parse(raw) as ReplayData;
        }
      }
      return null;
    } catch (e: any) {
      console.error(`[ReplayFileService] Error loading replay ${gameId}:`, e.message);
      return null;
    }
  }

  /**
   * Lista las grabaciones disponibles, opcionalmente filtradas por room_id.
   * Retorna metadatos sin el timeline completo (para listados).
   */
  static list(options?: { roomId?: string; limit?: number }): Omit<ReplayData, 'timeline' | 'admin_timeline'>[] {
    this.init();
    const limit = options?.limit || 100;
    const results: Omit<ReplayData, 'timeline' | 'admin_timeline'>[] = [];

    try {
      const months = fs.readdirSync(this.BASE_DIR)
        .filter(d => fs.statSync(path.join(this.BASE_DIR, d)).isDirectory())
        .sort()
        .reverse();

      for (const month of months) {
        if (results.length >= limit) break;
        const monthDir = path.join(this.BASE_DIR, month);
        const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.json')).sort().reverse();

        for (const file of files) {
          if (results.length >= limit) break;
          try {
            const raw = fs.readFileSync(path.join(monthDir, file), 'utf-8');
            const replay = JSON.parse(raw) as ReplayData;
            if (options?.roomId && replay.room_id !== options.roomId) continue;
            // Excluir timelines pesados del listado
            const { timeline, admin_timeline, ...meta } = replay;
            results.push(meta);
          } catch {
            // Archivo corrupto, saltar
          }
        }
      }
    } catch (e: any) {
      console.error('[ReplayFileService] Error listing replays:', e.message);
    }

    return results;
  }
}
