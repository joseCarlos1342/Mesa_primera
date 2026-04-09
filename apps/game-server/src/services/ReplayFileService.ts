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
   * Guarda una grabación como archivos JSON y MP4 en el filesystem.
   * Por requisitos de diseño, se crea un par simultáneo .json y .mp4 (mock temporal para el video).
   * Retorna true si se guardaron exitosamente.
   */
  static save(replay: ReplayData): boolean {
    this.init();
    try {
      const monthDir = path.join(this.BASE_DIR, this.getMonthDir(replay.created_at));
      if (!this.ensureDir(monthDir)) return false;

      const baseFilePath = path.join(monthDir, replay.game_id);
      
      // Guardar JSON (metadatos y timeline)
      fs.writeFileSync(`${baseFilePath}.json`, JSON.stringify(replay), 'utf-8');
      
      // Guardar Video (Mock vacío por el momento, requiere implementación real de grabación en cliente/servidor)
      if (!fs.existsSync(`${baseFilePath}.mp4`)) {
        fs.writeFileSync(`${baseFilePath}.mp4`, Buffer.from('dummy video context'), 'utf-8');
      }

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

  /** Máximo de días que se retienen las grabaciones para jugadores */
  private static readonly RETENTION_DAYS = 7;

  /**
   * Elimina archivos de replay con más de RETENTION_DAYS días de antigüedad.
   * Se ejecuta al iniciar el servidor y periódicamente.
   * Retorna el número de archivos eliminados.
   */
  static cleanup(): number {
    this.init();
    let deleted = 0;
    const cutoff = Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000;

    try {
      const months = fs.readdirSync(this.BASE_DIR)
        .filter(d => fs.statSync(path.join(this.BASE_DIR, d)).isDirectory());

      for (const month of months) {
        const monthDir = path.join(this.BASE_DIR, month);
        const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.json') || f.endsWith('.mp4'));

        for (const file of files) {
          const filePath = path.join(monthDir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs < cutoff) {
              fs.unlinkSync(filePath);
              deleted++;
            }
          } catch {
            // Archivo ya borrado o inaccesible, saltar
          }
        }

        // Eliminar carpeta mensual si quedó vacía
        try {
          const remaining = fs.readdirSync(monthDir);
          if (remaining.length === 0) {
            fs.rmdirSync(monthDir);
          }
        } catch {
          // OK
        }
      }

      if (deleted > 0) {
        console.log(`[ReplayFileService] Cleanup: ${deleted} replays eliminados (más de ${this.RETENTION_DAYS} días)`);
      }
    } catch (e: any) {
      console.error('[ReplayFileService] Cleanup error:', e.message);
    }

    return deleted;
  }

  /**
   * Inicia el job periódico de limpieza (cada 6 horas).
   * Llamar una vez al iniciar el servidor.
   */
  static startCleanupJob(): void {
    // Limpieza inmediata al arrancar
    this.cleanup();
    // Repetir cada 6 horas
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(() => this.cleanup(), SIX_HOURS);
    console.log(`[ReplayFileService] Cleanup job iniciado: cada 6h, retención=${this.RETENTION_DAYS} días`);
  }

  /**
   * Lista las grabaciones disponibles, opcionalmente filtradas por room_id.
   * Retorna metadatos sin el timeline completo (para listados).
   */
  static list(options?: { roomId?: string; limit?: number }): Omit<ReplayData, 'timeline' | 'admin_timeline'>[] {
    this.init();
    const limit = options?.limit || 100;
    const cutoff = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
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
            // Filtrar replays más antiguos que la ventana de retención
            if (replay.created_at < cutoff) continue;
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
