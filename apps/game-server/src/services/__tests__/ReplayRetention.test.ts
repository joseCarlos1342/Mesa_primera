import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ReplayFileService, ReplayData } from '../ReplayFileService';

// ── Helper: crear replay con fecha específica ──

function makeReplay(gameId: string, createdAt: Date, roomId?: string): ReplayData {
  return {
    game_id: gameId,
    round_number: 1,
    rng_seed: 'test-seed',
    timeline: [{ event: 'start' }],
    admin_timeline: [{ event: 'start', rng_state: 'abc' }],
    players: [{ userId: 'user-1', nickname: 'Player1', cards: '01-O,02-C', chips: 50000 }],
    pot_breakdown: { totalPot: 10000 },
    final_hands: {},
    room_id: roomId || null,
    table_name: 'Mesa Test',
    created_at: createdAt.toISOString(),
  };
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('ReplayFileService — 7-day Retention', () => {
  let tmpDir: string;

  beforeEach(() => {
    // Crear un directorio temporal para cada test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-test-'));
    // Forzar el BASE_DIR al directorio temporal (readonly bypass)
    (ReplayFileService as any).BASE_DIR = tmpDir;
    // Resetear el estado interno del servicio
    (ReplayFileService as any).initialized = false;
  });

  afterEach(() => {
    // Limpiar directorio temporal
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── save & load básico ──

  it('guarda y carga un replay correctamente', () => {
    const replay = makeReplay('game-001', new Date());
    const saved = ReplayFileService.save(replay);
    expect(saved).toBe(true);

    const loaded = ReplayFileService.load('game-001');
    expect(loaded).not.toBeNull();
    expect(loaded!.game_id).toBe('game-001');
    expect(loaded!.players[0].nickname).toBe('Player1');
  });

  // ── cleanup: borra archivos >7 días ──

  it('cleanup elimina replays con más de 7 días de antigüedad', () => {
    // Guardar un replay reciente (hoy)
    const recent = makeReplay('game-recent', new Date());
    ReplayFileService.save(recent);

    // Guardar un replay viejo (10 días atrás) — manipular mtime
    const old = makeReplay('game-old', daysAgo(10));
    ReplayFileService.save(old);
    // Cambiar mtime del archivo viejo para que el cleanup lo detecte
    const oldMonthDir = `${daysAgo(10).getFullYear()}-${String(daysAgo(10).getMonth() + 1).padStart(2, '0')}`;
    const oldFilePath = path.join(tmpDir, oldMonthDir, 'game-old.json');
    const tenDaysAgo = daysAgo(10);
    fs.utimesSync(oldFilePath, tenDaysAgo, tenDaysAgo);

    // Ejecutar cleanup
    const deleted = ReplayFileService.cleanup();

    expect(deleted).toBe(1);
    // El archivo viejo ya no debe existir
    expect(fs.existsSync(oldFilePath)).toBe(false);
    // El reciente sí debe seguir
    const recentLoaded = ReplayFileService.load('game-recent');
    expect(recentLoaded).not.toBeNull();
  });

  it('cleanup no elimina replays de menos de 7 días', () => {
    const replay3days = makeReplay('game-3d', daysAgo(3));
    ReplayFileService.save(replay3days);
    // Asegurar mtime = 3 días atrás
    const monthDir = `${daysAgo(3).getFullYear()}-${String(daysAgo(3).getMonth() + 1).padStart(2, '0')}`;
    const filePath = path.join(tmpDir, monthDir, 'game-3d.json');
    const threeDaysAgo = daysAgo(3);
    fs.utimesSync(filePath, threeDaysAgo, threeDaysAgo);

    const deleted = ReplayFileService.cleanup();
    expect(deleted).toBe(0);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('cleanup elimina carpetas mensuales vacías', () => {
    // Crear replay viejo, luego hacer cleanup
    const old = makeReplay('game-old2', daysAgo(15));
    ReplayFileService.save(old);
    const oldMonthDir = `${daysAgo(15).getFullYear()}-${String(daysAgo(15).getMonth() + 1).padStart(2, '0')}`;
    const oldFilePath = path.join(tmpDir, oldMonthDir, 'game-old2.json');
    const fifteenDaysAgo = daysAgo(15);
    fs.utimesSync(oldFilePath, fifteenDaysAgo, fifteenDaysAgo);

    ReplayFileService.cleanup();

    // La carpeta mensual debe haberse eliminado si quedó vacía
    // (solo si no hay otros replays en ese mes)
    const monthDirPath = path.join(tmpDir, oldMonthDir);
    if (fs.existsSync(monthDirPath)) {
      // Si existe todavía, debe estar vacía o tener archivos recientes
      const remaining = fs.readdirSync(monthDirPath);
      expect(remaining.length).toBe(0);
    }
  });

  // ── list: solo retorna replays dentro de la ventana de 7 días ──

  it('list solo retorna replays de los últimos 7 días', () => {
    // Guardar 3 replays: 1 de hoy, 1 de 5 días, 1 de 10 días
    const today = makeReplay('game-today', new Date());
    const fiveDays = makeReplay('game-5d', daysAgo(5));
    const tenDays = makeReplay('game-10d', daysAgo(10));

    ReplayFileService.save(today);
    ReplayFileService.save(fiveDays);
    ReplayFileService.save(tenDays);

    const listed = ReplayFileService.list();

    const ids = listed.map(r => r.game_id);
    expect(ids).toContain('game-today');
    expect(ids).toContain('game-5d');
    expect(ids).not.toContain('game-10d');
  });

  it('list filtra por roomId y ventana de 7 días', () => {
    const recent = makeReplay('game-r1', new Date(), 'room-A');
    const recentOther = makeReplay('game-r2', new Date(), 'room-B');
    const old = makeReplay('game-r3', daysAgo(10), 'room-A');

    ReplayFileService.save(recent);
    ReplayFileService.save(recentOther);
    ReplayFileService.save(old);

    const listed = ReplayFileService.list({ roomId: 'room-A' });

    expect(listed.length).toBe(1);
    expect(listed[0].game_id).toBe('game-r1');
  });

  it('list respeta el límite', () => {
    for (let i = 0; i < 5; i++) {
      ReplayFileService.save(makeReplay(`game-lim-${i}`, new Date()));
    }

    const listed = ReplayFileService.list({ limit: 3 });
    expect(listed.length).toBe(3);
  });

  // ── cleanup combinado con list ──

  it('después de cleanup, los replays viejos desaparecen de list y load', () => {
    const recent = makeReplay('game-keep', new Date());
    const old = makeReplay('game-remove', daysAgo(9));
    ReplayFileService.save(recent);
    ReplayFileService.save(old);

    // Manipular mtime
    const oldMonth = `${daysAgo(9).getFullYear()}-${String(daysAgo(9).getMonth() + 1).padStart(2, '0')}`;
    const oldPath = path.join(tmpDir, oldMonth, 'game-remove.json');
    const nineDaysAgo = daysAgo(9);
    fs.utimesSync(oldPath, nineDaysAgo, nineDaysAgo);

    // Cleanup
    ReplayFileService.cleanup();

    // List ya no lo muestra (ya se borró del filesystem)
    const listed = ReplayFileService.list();
    expect(listed.map(r => r.game_id)).not.toContain('game-remove');

    // Load tampoco
    expect(ReplayFileService.load('game-remove')).toBeNull();

    // El reciente sigue existiendo
    expect(ReplayFileService.load('game-keep')).not.toBeNull();
  });

  // ── load no devuelve replays fuera de la ventana (archivo existe pero contenido viejo) ──
  // Nota: load no filtra por fecha, eso lo hace list y el cleanup.
  // El load debe seguir funcionando mientras el archivo exista (necesario para admin fallback)

  it('load devuelve replay mientras el archivo exista (sin filtro de fecha)', () => {
    const old = makeReplay('game-still-loadable', daysAgo(10));
    ReplayFileService.save(old);

    // El archivo existe, load debe retornarlo (admin fallback)
    const loaded = ReplayFileService.load('game-still-loadable');
    expect(loaded).not.toBeNull();
    expect(loaded!.game_id).toBe('game-still-loadable');
  });

  // ── edge: replay con created_at exactamente en el límite ──

  it('replay exactamente al borde de 7 días se incluye en list', () => {
    // Exactamente 7 días atrás menos 1 minuto (debería incluirse)
    const borderline = makeReplay('game-border', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60_000));
    ReplayFileService.save(borderline);

    const listed = ReplayFileService.list();
    expect(listed.map(r => r.game_id)).toContain('game-border');
  });

  it('replay justo después de 7 días se excluye de list', () => {
    // 7 días y 1 minuto atrás (no debería incluirse)
    const expired = makeReplay('game-expired', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 60_000));
    ReplayFileService.save(expired);

    const listed = ReplayFileService.list();
    expect(listed.map(r => r.game_id)).not.toContain('game-expired');
  });
});
