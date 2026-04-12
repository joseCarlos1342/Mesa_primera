import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ReplayFileService, ReplayData } from '../ReplayFileService';

function makeReplay(gameId: string, createdAt: Date): ReplayData {
  return {
    game_id: gameId,
    round_number: 1,
    rng_seed: 'test-seed',
    timeline: [{ event: 'start' }],
    admin_timeline: [{ event: 'start', rng_state: 'abc' }],
    players: [{ userId: 'user-1', nickname: 'Player1', cards: '01-O,02-C', chips: 50000 }],
    pot_breakdown: { totalPot: 10000 },
    final_hands: {},
    room_id: null,
    table_name: 'Mesa Test',
    created_at: createdAt.toISOString(),
  };
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('ReplayFileService — MP4 Integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-mp4-test-'));
    (ReplayFileService as any).BASE_DIR = tmpDir;
    (ReplayFileService as any).initialized = false;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── findMp4 ──

  it('findMp4 encuentra un MP4 existente', () => {
    const replay = makeReplay('game-mp4', new Date());
    ReplayFileService.save(replay);

    // Crear un MP4 fake
    const monthDir = ReplayFileService.getMonthDirFor(replay.created_at);
    const mp4Path = path.join(tmpDir, monthDir, 'game-mp4.mp4');
    fs.writeFileSync(mp4Path, Buffer.from('fake video data'));

    const found = ReplayFileService.findMp4('game-mp4');
    expect(found).toBe(mp4Path);
  });

  it('findMp4 retorna null cuando no hay MP4', () => {
    const replay = makeReplay('game-no-mp4', new Date());
    ReplayFileService.save(replay);

    const found = ReplayFileService.findMp4('game-no-mp4');
    expect(found).toBeNull();
  });

  // ── getMonthDirFor ──

  it('getMonthDirFor genera el formato correcto YYYY-MM', () => {
    expect(ReplayFileService.getMonthDirFor('2026-04-12T10:00:00Z')).toBe('2026-04');
    expect(ReplayFileService.getMonthDirFor('2026-01-15T12:00:00Z')).toBe('2026-01');
    expect(ReplayFileService.getMonthDirFor('2025-12-15T12:00:00Z')).toBe('2025-12');
  });

  // ── cleanup con archivos MP4 y temporales ──

  it('cleanup elimina mp4 y json juntos cuando expiran', () => {
    const replay = makeReplay('game-old-mp4', daysAgo(10));
    ReplayFileService.save(replay);

    const monthDir = ReplayFileService.getMonthDirFor(replay.created_at);
    const monthPath = path.join(tmpDir, monthDir);

    // Crear MP4 y temp files
    const mp4Path = path.join(monthPath, 'game-old-mp4.mp4');
    const tmpPath = path.join(monthPath, 'game-old-mp4.mp4.tmp');
    fs.writeFileSync(mp4Path, 'fake video');
    fs.writeFileSync(tmpPath, 'tmp data');

    // Cambiar mtime
    const old = daysAgo(10);
    const jsonPath = path.join(monthPath, 'game-old-mp4.json');
    fs.utimesSync(jsonPath, old, old);
    fs.utimesSync(mp4Path, old, old);
    fs.utimesSync(tmpPath, old, old);

    const deleted = ReplayFileService.cleanup();
    expect(deleted).toBeGreaterThanOrEqual(3);
    expect(fs.existsSync(jsonPath)).toBe(false);
    expect(fs.existsSync(mp4Path)).toBe(false);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('cleanup elimina archivos .webm huérfanos', () => {
    const replay = makeReplay('game-webm', daysAgo(10));
    ReplayFileService.save(replay);

    const monthDir = ReplayFileService.getMonthDirFor(replay.created_at);
    const monthPath = path.join(tmpDir, monthDir);

    const webmPath = path.join(monthPath, 'game-webm.webm');
    fs.writeFileSync(webmPath, 'webm data');

    const old = daysAgo(10);
    fs.utimesSync(path.join(monthPath, 'game-webm.json'), old, old);
    fs.utimesSync(webmPath, old, old);

    const deleted = ReplayFileService.cleanup();
    expect(deleted).toBeGreaterThanOrEqual(2);
    expect(fs.existsSync(webmPath)).toBe(false);
  });

  // ── save ya no crea dummy MP4 ──

  it('save ya no crea un archivo MP4 dummy', () => {
    const replay = makeReplay('game-no-dummy', new Date());
    ReplayFileService.save(replay);

    const monthDir = ReplayFileService.getMonthDirFor(replay.created_at);
    const mp4Path = path.join(tmpDir, monthDir, 'game-no-dummy.mp4');
    expect(fs.existsSync(mp4Path)).toBe(false);

    // Pero el JSON sí debe existir
    const jsonPath = path.join(tmpDir, monthDir, 'game-no-dummy.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
  });

  // ── baseDir accessor ──

  it('baseDir retorna la ruta configurada', () => {
    expect(ReplayFileService.baseDir).toBe(tmpDir);
  });
});
