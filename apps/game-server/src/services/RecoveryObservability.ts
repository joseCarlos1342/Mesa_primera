export type RecoveryEvent =
  | "recovery_detected"
  | "checkpoint_load_failed"
  | "replacement_created"
  | "replacement_published"
  | "replacement_retry"
  | "roster_completed"
  | "deadline_expired"
  | "manual_review"
  | "critical_process_failure";

export interface RecoveryLogEntry {
  level: "info" | "warn" | "error";
  event: RecoveryEvent;
  roomId?: string;
  gameId?: string;
  phase?: string;
  errCode?: string;
}

export interface StructuredLogger {
  log(entry: RecoveryLogEntry): void;
}

export interface RecoveryMetrics {
  increment(event: RecoveryEvent): void;
  snapshot(): Record<`${RecoveryEvent}_total`, number>;
}

const recoveryEvents: RecoveryEvent[] = [
  "recovery_detected",
  "checkpoint_load_failed",
  "replacement_created",
  "replacement_published",
  "replacement_retry",
  "roster_completed",
  "deadline_expired",
  "manual_review",
  "critical_process_failure",
];

export function createStructuredLogger(options: {
  write?: (line: string) => void;
  now?: () => Date;
} = {}): StructuredLogger {
  const write = options.write ?? ((line: string) => process.stdout.write(line));
  const now = options.now ?? (() => new Date());

  return {
    log(entry) {
      write(`${JSON.stringify({
        ts: now().toISOString(),
        level: entry.level,
        roomId: entry.roomId ?? null,
        gameId: entry.gameId ?? null,
        event: entry.event,
        phase: entry.phase ?? null,
        errCode: entry.errCode ?? null,
      })}\n`);
    },
  };
}

export function createRecoveryMetrics(): RecoveryMetrics {
  const counters = Object.fromEntries(
    recoveryEvents.map((event) => [`${event}_total`, 0]),
  ) as Record<`${RecoveryEvent}_total`, number>;

  return {
    increment(event) {
      counters[`${event}_total`] += 1;
    },
    snapshot() {
      return { ...counters };
    },
  };
}

export interface RecoveryObserver {
  record(entry: RecoveryLogEntry): void;
}

export function createRecoveryObserver(options: {
  logger?: StructuredLogger;
  metrics?: RecoveryMetrics;
} = {}): RecoveryObserver {
  const logger = options.logger ?? createStructuredLogger();
  const metrics = options.metrics ?? createRecoveryMetrics();

  return {
    record(entry) {
      metrics.increment(entry.event);
      logger.log(entry);
    },
  };
}

export const recoveryMetrics = createRecoveryMetrics();
export const recoveryObserver = createRecoveryObserver({ metrics: recoveryMetrics });

export interface RecoveryHealth {
  status: "ok" | "degraded";
  reason?: "checkpoint_load_failed";
}

let recoveryHealth: RecoveryHealth = { status: "ok" };

export function markRecoveryDegraded(reason: "checkpoint_load_failed"): void {
  recoveryHealth = { status: "degraded", reason };
}

export function markRecoveryHealthy(): void {
  recoveryHealth = { status: "ok" };
}

export function getRecoveryHealth(): RecoveryHealth {
  return { ...recoveryHealth };
}

export function resetRecoveryHealth(): void {
  markRecoveryHealthy();
}
