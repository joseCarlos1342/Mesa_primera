import { Queue, Worker, QueueEvents } from "bullmq";
import { createClient } from "@supabase/supabase-js";

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cola genérica para procesamientos del ledger (ej. reconciliación asíncrona)
export const ledgerQueue = new Queue("ledgerProcessing", {
  connection: redisOptions,
});

export const ledgerQueueEvents = new QueueEvents("ledgerProcessing", {
  connection: redisOptions,
});

// Silenciar errores de conexión de Redis
ledgerQueue.on('error', (err) => console.warn('[Redis Silenced - LedgerQueue]:', err.message));
ledgerQueueEvents.on('error', (err) => console.warn('[Redis Silenced - LedgerQueueEvents]:', err.message));

export const ledgerWorker = new Worker(
  "ledgerProcessing",
  async (job) => {
    console.log(`[LedgerWorker] Procesando trabajo ${job.id}`);
    if (job.name === "reconcile") {
      if (!supabaseKey) {
        console.warn('[LedgerWorker] No SUPABASE_SERVICE_ROLE_KEY, skipping reconciliation');
        return { skipped: true };
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get all users with wallets
      const { data: wallets, error: walletsErr } = await supabase
        .from('wallets')
        .select('user_id, balance');

      if (walletsErr) {
        console.error('[LedgerWorker] Error fetching wallets:', walletsErr);
        return { error: walletsErr.message };
      }

      const discrepancies: { userId: string; walletBalance: number; ledgerBalance: number }[] = [];

      for (const wallet of (wallets || [])) {
        // Get the last ledger entry balance for this user
        const { data: lastEntry, error: ledgerErr } = await supabase
          .from('ledger')
          .select('balance_after_cents')
          .eq('user_id', wallet.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ledgerErr) {
          console.error(`[LedgerWorker] Error fetching ledger for ${wallet.user_id}:`, ledgerErr);
          continue;
        }

        const ledgerBalance = lastEntry?.balance_after_cents ?? 0;
        const walletBalance = wallet.balance ?? 0;

        if (ledgerBalance !== walletBalance) {
          discrepancies.push({
            userId: wallet.user_id,
            walletBalance,
            ledgerBalance
          });
          console.warn(`[LedgerWorker] DISCREPANCY: user=${wallet.user_id} wallet=${walletBalance} ledger=${ledgerBalance}`);
        }
      }

      if (discrepancies.length === 0) {
        console.log(`[LedgerWorker] Reconciliation OK: ${wallets?.length || 0} wallets verified`);
      } else {
        console.warn(`[LedgerWorker] Reconciliation found ${discrepancies.length} discrepancies`);
      }

      return { checked: wallets?.length || 0, discrepancies };
    }
  },
  { connection: redisOptions }
);

ledgerWorker.on('error', (err) => console.warn('[Redis Silenced - LedgerWorker]:', err.message));

ledgerWorker.on("completed", (job) => {
  console.log(`[LedgerWorker] Trabajo ${job.id} ha completado exitosamente`);
});

ledgerWorker.on("failed", (job, err) => {
  console.error(`[LedgerWorker] Trabajo ${job?.id} falló con error:`, err);
});
