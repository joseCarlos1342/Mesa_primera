import { Queue, Worker, QueueEvents } from "bullmq";

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Cola genérica para procesamientos del ledger (ej. reconciliación asíncrona)
export const ledgerQueue = new Queue("ledgerProcessing", {
  connection: redisOptions,
});

export const ledgerQueueEvents = new QueueEvents("ledgerProcessing", {
  connection: redisOptions,
});

// Silenciar errores de conexión de Redis
ledgerQueue.on('error', (err) => console.warn('[Redis Silenced - LedgerQueue]:', err.message));
ledgerWorker.on('error', (err) => console.warn('[Redis Silenced - LedgerWorker]:', err.message));
ledgerQueueEvents.on('error', (err) => console.warn('[Redis Silenced - LedgerQueueEvents]:', err.message));

export const ledgerWorker = new Worker(
  "ledgerProcessing",
  async (job) => {
    console.log(`[LedgerWorker] Procesando trabajo ${job.id}`);
    if (job.name === "reconcile") {
      // TODO: Logica de reconciliacion asíncrona
      return true;
    }
  },
  { connection: redisOptions }
);

ledgerWorker.on("completed", (job) => {
  console.log(`[LedgerWorker] Trabajo ${job.id} ha completado exitosamente`);
});

ledgerWorker.on("failed", (job, err) => {
  console.error(`[LedgerWorker] Trabajo ${job?.id} falló con error:`, err);
});
