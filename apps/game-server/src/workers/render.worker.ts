import { Worker, Job } from 'bullmq';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { RenderJobData, RenderJobResult } from '../types/render';
import { ReplayFileService } from '../services/ReplayFileService';

export const RENDER_QUEUE_NAME = 'mp4-render';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const RENDER_URL = process.env.RENDER_PAGE_URL || 'http://localhost:3000/admin/render';
const RENDER_TOKEN = process.env.RENDER_SECRET_TOKEN || '';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

async function updateMp4Status(
  gameId: string,
  status: string,
  extra?: { path?: string; sizeBytes?: number; durationMs?: number; error?: string },
) {
  if (!supabase) return;
  await supabase.rpc('update_replay_mp4_status', {
    p_game_id: gameId,
    p_status: status,
    p_path: extra?.path ?? null,
    p_size_bytes: extra?.sizeBytes ?? null,
    p_duration_ms: extra?.durationMs ?? null,
    p_error: extra?.error ?? null,
  });
}

/**
 * Duración del video en ms obtenida con ffprobe.
 * Devuelve null si ffprobe no está disponible.
 */
function getVideoDurationMs(filePath: string): number | null {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8', timeout: 10_000 },
    );
    return Math.round(parseFloat(out.trim()) * 1000);
  } catch {
    return null;
  }
}

async function processRenderJob(job: Job<RenderJobData>): Promise<RenderJobResult> {
  const { gameId, replayPath, createdAt } = job.data;
  const baseDir = ReplayFileService.baseDir;
  const monthDir = ReplayFileService.getMonthDirFor(createdAt);
  const mp4Dir = path.join(baseDir, monthDir);
  const mp4FinalPath = path.join(mp4Dir, `${gameId}.mp4`);
  const mp4TmpPath = `${mp4FinalPath}.tmp`;

  console.log(`[RenderWorker] Processing job ${job.id} for game ${gameId}`);

  // Marcar como processing
  await updateMp4Status(gameId, 'processing');

  try {
    // Verificar que el JSON existe
    const jsonPath = path.join(baseDir, replayPath);
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Replay JSON not found: ${jsonPath}`);
    }

    // Asegurar directorio de salida
    if (!fs.existsSync(mp4Dir)) {
      fs.mkdirSync(mp4Dir, { recursive: true });
    }

    // Renderizar con Playwright
    const renderUrl = `${RENDER_URL}/${gameId}?token=${encodeURIComponent(RENDER_TOKEN)}`;

    // Importar Playwright dinámicamente para no requerir la dependencia en tests unitarios
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: path.dirname(mp4TmpPath),
        size: { width: 1280, height: 720 },
      },
    });

    const page = await context.newPage();
    await page.goto(renderUrl, { waitUntil: 'networkidle' });

    // Esperar a que la página señalice que terminó la reproducción
    await page.waitForSelector('[data-render-done="true"]', { timeout: 120_000 });

    // Cerrar para finalizar la grabación
    await context.close();
    await browser.close();

    // Playwright graba como .webm — encontrar el archivo y convertir a MP4
    const videoFiles = fs.readdirSync(path.dirname(mp4TmpPath))
      .filter(f => f.endsWith('.webm'))
      .map(f => path.join(path.dirname(mp4TmpPath), f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    const recordedFile = videoFiles[0];
    if (!recordedFile || !fs.existsSync(recordedFile)) {
      throw new Error('Playwright video file not found after recording');
    }

    // Convertir webm → mp4 (escritura atómica: tmp → rename)
    execSync(
      `ffmpeg -y -i "${recordedFile}" -c:v libx264 -preset fast -crf 23 -an "${mp4TmpPath}"`,
      { timeout: 120_000 },
    );

    // Limpiar webm temporal
    try { fs.unlinkSync(recordedFile); } catch { /* ya eliminado */ }

    // Rename atómico
    fs.renameSync(mp4TmpPath, mp4FinalPath);

    const stat = fs.statSync(mp4FinalPath);
    const durationMs = getVideoDurationMs(mp4FinalPath);

    await updateMp4Status(gameId, 'ready', {
      path: `${monthDir}/${gameId}.mp4`,
      sizeBytes: stat.size,
      durationMs: durationMs ?? undefined,
    });

    console.log(`[RenderWorker] ✓ Game ${gameId} rendered: ${stat.size} bytes`);
    return {
      status: 'ready',
      mp4Path: mp4FinalPath,
      sizeBytes: stat.size,
      durationMs: durationMs ?? undefined,
    };
  } catch (err: any) {
    console.error(`[RenderWorker] ✗ Game ${gameId} failed:`, err.message);

    // Limpiar temporales
    try { if (fs.existsSync(mp4TmpPath)) fs.unlinkSync(mp4TmpPath); } catch { /* ok */ }

    await updateMp4Status(gameId, 'failed', { error: err.message?.slice(0, 500) });

    return { status: 'failed', errorReason: err.message };
  }
}

export const renderWorker = new Worker(RENDER_QUEUE_NAME, processRenderJob, {
  connection,
  concurrency: 1, // Un render a la vez para no saturar CPU/memoria
  limiter: { max: 5, duration: 60_000 }, // Máximo 5 por minuto
});

renderWorker.on('completed', (job) => {
  console.log(`[RenderWorker] Job ${job.id} completed for game: ${job.data?.gameId}`);
});

let lastRedisError = '';
renderWorker.on('error', (err) => {
  if (err.message === lastRedisError) return;
  lastRedisError = err.message;
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Redis Silenced - RenderWorker]:', err.message);
  } else {
    console.error('[RenderWorker] Redis Error:', err);
  }
});

renderWorker.on('failed', (job, err) => {
  console.error(`[RenderWorker] Job ${job?.id} failed for game ${job?.data?.gameId}:`, err);
});
