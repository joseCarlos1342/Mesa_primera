import { describe, expect, it, vi } from "vitest";
import {
  createRecoveryMetrics,
  createRecoveryObserver,
  createStructuredLogger,
} from "../RecoveryObservability";

describe("RecoveryObservability", () => {
  it("emite una linea JSON con el contexto requerido para cada lifecycle event", () => {
    const write = vi.fn();
    const logger = createStructuredLogger({
      write,
      now: () => new Date("2026-07-12T12:00:00.000Z"),
    });

    logger.log({
      level: "info",
      event: "replacement_created",
      roomId: "room-1",
      gameId: "game-1",
      phase: "APUESTA_4_CARTAS",
    });

    expect(write).toHaveBeenCalledOnce();
    expect(JSON.parse(write.mock.calls[0][0])).toEqual({
      ts: "2026-07-12T12:00:00.000Z",
      level: "info",
      roomId: "room-1",
      gameId: "game-1",
      event: "replacement_created",
      phase: "APUESTA_4_CARTAS",
      errCode: null,
    });
  });

  it("incrementa el contador de cada evento de recovery", () => {
    const metrics = createRecoveryMetrics();
    const observer = createRecoveryObserver({
      metrics,
      logger: { log: vi.fn() },
    });

    observer.record({ level: "info", event: "recovery_detected" });
    observer.record({ level: "info", event: "replacement_created" });
    observer.record({ level: "info", event: "roster_completed" });
    observer.record({ level: "warn", event: "deadline_expired" });
    observer.record({ level: "error", event: "manual_review" });

    expect(metrics.snapshot()).toEqual({
      recovery_detected_total: 1,
      replacement_created_total: 1,
      roster_completed_total: 1,
      deadline_expired_total: 1,
      manual_review_total: 1,
      critical_process_failure_total: 0,
    });
  });
});
