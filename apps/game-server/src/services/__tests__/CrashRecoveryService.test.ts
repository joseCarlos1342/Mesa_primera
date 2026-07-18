import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  CrashRecoveryService,
  type CrashRecoveryDependencies,
} from "../CrashRecoveryService";
import { stableJson } from "../RecoveryPolicy";
import {
  createRecoveryMetrics,
  createRecoveryObserver,
  getRecoveryHealth,
  resetRecoveryHealth,
} from "../RecoveryObservability";

const privateState = { gameState: { phase: "APUESTA_4_CARTAS" } };
const validCheckpoint = {
  gameId: "game-1",
  roomId: "original-room-1",
  checkpointVersion: 3,
  stateHash: createHash("sha256").update(stableJson(privateState)).digest("hex"),
  privateState,
  rosterUserIds: ["player-1", "player-2"],
  recoveryDeadlineAt: new Date("2026-07-12T12:02:00.000Z"),
};

function createDependencies(
  overrides: Partial<CrashRecoveryDependencies> = {},
): CrashRecoveryDependencies {
  return {
    loadPendingRecoveryCheckpoints: vi.fn().mockResolvedValue([validCheckpoint]),
    createRecoveryIncident: vi.fn().mockResolvedValue({ success: true }),
    claimRecoveryIncident: vi.fn().mockResolvedValue({ claimed: true, fence: 1 }),
    saveRecoveredRoomMapping: vi.fn().mockResolvedValue({ success: true }),
    renewRecoveredRoomMappingLease: vi.fn().mockResolvedValue({ renewed: true }),
    createReplacementRoom: vi.fn().mockResolvedValue({ roomId: "recovered-room-1" }),
    disposeReplacementRoom: vi.fn().mockResolvedValue(undefined),
    deriveRecoveryRefunds: vi.fn().mockResolvedValue({
      success: true,
      refunds: [{ userId: "player-1", amountCents: 500_000 }],
    }),
    expireRecoveryIncidentAndRefund: vi.fn().mockResolvedValue({ success: true, status: "cancelled_crash" }),
    markRecoveryIncidentManualReview: vi.fn().mockResolvedValue({ success: true, status: "manual_review", updated: true }),
    emitRecoveryManualReviewAlert: vi.fn().mockResolvedValue(undefined),
    emitRecoveryInfrastructureAlert: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn(),
    now: () => new Date("2026-07-12T12:00:00.000Z"),
    ...overrides,
  };
}

describe("CrashRecoveryService", () => {
  it("distingue el fallo al cargar checkpoints de una lista vacía, degrada health y reintenta", async () => {
    resetRecoveryHealth();
    const metrics = createRecoveryMetrics();
    const observer = createRecoveryObserver({ metrics, logger: { log: vi.fn() } });
    let retry: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      loadPendingRecoveryCheckpoints: vi.fn()
        .mockRejectedValueOnce(new Error("database unavailable"))
        .mockResolvedValueOnce([]),
      schedule: vi.fn((callback) => {
        retry = callback;
      }),
    });
    const service = new CrashRecoveryService(dependencies, observer);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(metrics.snapshot().checkpoint_load_failed_total).toBe(1);
    expect(getRecoveryHealth()).toEqual({ status: "degraded", reason: "checkpoint_load_failed" });
    expect(dependencies.emitRecoveryInfrastructureAlert).toHaveBeenCalledWith({
      event: "checkpoint_load_failed",
      reason: "database unavailable",
    });
    expect(dependencies.schedule).toHaveBeenCalledWith(expect.any(Function), 1_000);

    await retry?.();

    expect(dependencies.loadPendingRecoveryCheckpoints).toHaveBeenCalledTimes(2);
    expect(getRecoveryHealth()).toEqual({ status: "ok" });
  });

  it("reintenta crear el replacement tras un fallo transitorio hasta completar el mapping", async () => {
    const metrics = createRecoveryMetrics();
    const observer = createRecoveryObserver({ metrics, logger: { log: vi.fn() } });
    const retries: Array<() => Promise<void>> = [];
    const dependencies = createDependencies({
      createReplacementRoom: vi.fn()
        .mockRejectedValueOnce(new Error("Redis unavailable"))
        .mockResolvedValueOnce({ roomId: "recovered-room-2" }),
      schedule: vi.fn((callback) => {
        retries.push(callback);
      }),
    });
    const service = new CrashRecoveryService(dependencies, observer);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(metrics.snapshot().replacement_retry_total).toBe(1);
    expect(dependencies.emitRecoveryInfrastructureAlert).toHaveBeenCalledWith({
      event: "replacement_retry",
      gameId: "game-1",
      roomId: "original-room-1",
      reason: "Redis unavailable",
    });
    expect(dependencies.claimRecoveryIncident).toHaveBeenCalledTimes(1);
    expect(dependencies.schedule).toHaveBeenCalledWith(expect.any(Function), 1_000);

    await retries[1]?.();

    expect(dependencies.claimRecoveryIncident).toHaveBeenCalledTimes(2);
    expect(dependencies.saveRecoveredRoomMapping).toHaveBeenCalledWith({
      gameId: "game-1",
      originalRoomId: "original-room-1",
      recoveredRoomId: "recovered-room-2",
      ownerId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      fence: 1,
    });
  });

  it("espera un claim ajeno y reintenta hasta obtener el claim propio antes del deadline", async () => {
    const retries: Array<() => Promise<void>> = [];
    const dependencies = createDependencies({
      claimRecoveryIncident: vi.fn()
        .mockResolvedValueOnce({ claimed: false })
        .mockResolvedValueOnce({ claimed: true, fence: 2 }),
      schedule: vi.fn((callback, delayMs) => {
        if (delayMs !== 120_000) retries.push(callback);
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.createReplacementRoom).not.toHaveBeenCalled();
    expect(dependencies.schedule).toHaveBeenCalledWith(expect.any(Function), 1_000);

    await retries[0]?.();

    expect(dependencies.claimRecoveryIncident).toHaveBeenCalledTimes(2);
    expect(dependencies.createReplacementRoom).toHaveBeenCalledOnce();
    expect(dependencies.saveRecoveredRoomMapping).toHaveBeenCalledWith(expect.objectContaining({ fence: 2 }));
  });

  it("abre un incidente idempotente y crea una sala de reemplazo", async () => {
    const dependencies = createDependencies();
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({
      "original-room-1": "recovered-room-1",
    });

    expect(dependencies.createRecoveryIncident).toHaveBeenCalledWith({
      gameId: "game-1",
      roomId: "original-room-1",
      detectedAt: new Date("2026-07-12T12:00:00.000Z"),
      causeCode: "process_restart",
    });
    expect(dependencies.createReplacementRoom).toHaveBeenCalledWith({
      recovery: validCheckpoint.privateState,
      recoveryContext: {
        ownerId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        fence: 1,
      },
    });
    expect(dependencies.claimRecoveryIncident).toHaveBeenCalledWith({
      gameId: "game-1",
      ownerId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(dependencies.saveRecoveredRoomMapping).toHaveBeenCalledWith({
      gameId: "game-1",
      originalRoomId: "original-room-1",
      recoveredRoomId: "recovered-room-1",
      ownerId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      fence: 1,
    });
  });

  it("registra la publicación del replacement sin declarar completo el roster", async () => {
    const metrics = createRecoveryMetrics();
    const observer = createRecoveryObserver({ metrics, logger: { log: vi.fn() } });
    const service = new CrashRecoveryService(createDependencies(), observer);

    await service.recoverPendingCheckpoints();

    expect(metrics.snapshot()).toMatchObject({
      recovery_detected_total: 1,
      replacement_created_total: 1,
      replacement_published_total: 1,
      roster_completed_total: 0,
    });
  });

  it.each([
    ["snapshot inválido", null],
    ["hash inválido", privateState, "hash-no-valido"],
  ])("abre incidente y escala a revisión manual para un checkpoint con %s", async (_caseName, invalidPrivateState, invalidStateHash) => {
    const dependencies = createDependencies({
      loadPendingRecoveryCheckpoints: vi.fn().mockResolvedValue([
        {
          ...validCheckpoint,
          privateState: invalidPrivateState,
          stateHash: invalidStateHash ?? createHash("sha256").update(stableJson(invalidPrivateState)).digest("hex"),
        },
      ]),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.createRecoveryIncident).toHaveBeenCalledWith({
      gameId: "game-1",
      roomId: "original-room-1",
      detectedAt: new Date("2026-07-12T12:00:00.000Z"),
      causeCode: "invalid_checkpoint",
    });
    expect(dependencies.markRecoveryIncidentManualReview).toHaveBeenCalledWith({
      gameId: "game-1",
      reason: "Checkpoint inválido o no recuperable",
    });
    expect(dependencies.emitRecoveryManualReviewAlert).toHaveBeenCalledWith({
      gameId: "game-1",
      roomId: "original-room-1",
      reason: "Checkpoint inválido o no recuperable",
    });
    expect(dependencies.createReplacementRoom).not.toHaveBeenCalled();
    expect(dependencies.deriveRecoveryRefunds).not.toHaveBeenCalled();
    expect(dependencies.expireRecoveryIncidentAndRefund).not.toHaveBeenCalled();
  });

  it("programa el deadline de una fase no recuperable y la cancela solo al vencer", async () => {
    const animatedPrivateState = { gameState: { phase: "COMPLETAR" } };
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      loadPendingRecoveryCheckpoints: vi.fn().mockResolvedValue([{
        ...validCheckpoint,
        privateState: animatedPrivateState,
        stateHash: createHash("sha256").update(stableJson(animatedPrivateState)).digest("hex"),
      }]),
      schedule: vi.fn((callback, delayMs) => {
        if (delayMs !== 10_000) expiration = callback;
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.createRecoveryIncident).toHaveBeenCalledWith({
      gameId: "game-1",
      roomId: "original-room-1",
      detectedAt: new Date("2026-07-12T12:00:00.000Z"),
      causeCode: "unsupported_phase",
    });
    expect(dependencies.createReplacementRoom).not.toHaveBeenCalled();
    expect(dependencies.schedule).toHaveBeenCalledWith(expect.any(Function), 120_000);
    expect(dependencies.deriveRecoveryRefunds).not.toHaveBeenCalled();

    await expiration?.();

    expect(dependencies.deriveRecoveryRefunds).toHaveBeenCalledWith("game-1");
    expect(dependencies.expireRecoveryIncidentAndRefund).toHaveBeenCalledWith({
      gameId: "game-1",
      refunds: [{
        userId: "player-1",
        amountCents: 500_000,
        operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }],
    });
  });

  it("emite una alerta sin persistir cuando faltan gameId o roomId", async () => {
    const dependencies = createDependencies({
      loadPendingRecoveryCheckpoints: vi.fn().mockResolvedValue([
        {
          ...validCheckpoint,
          gameId: undefined as unknown as string,
          roomId: undefined as unknown as string,
        },
      ]),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.createRecoveryIncident).not.toHaveBeenCalled();
    expect(dependencies.markRecoveryIncidentManualReview).not.toHaveBeenCalled();
    expect(dependencies.emitRecoveryManualReviewAlert).toHaveBeenCalledWith({
      gameId: undefined,
      roomId: undefined,
      reason: "Checkpoint inválido sin identificadores de juego o sala",
    });
    expect(dependencies.createReplacementRoom).not.toHaveBeenCalled();
    expect(dependencies.deriveRecoveryRefunds).not.toHaveBeenCalled();
    expect(dependencies.expireRecoveryIncidentAndRefund).not.toHaveBeenCalled();
  });

  it("no crea una sala si no puede abrir el incidente", async () => {
    const dependencies = createDependencies({
      createRecoveryIncident: vi.fn().mockResolvedValue({
        success: false,
        error: "database unavailable",
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.createReplacementRoom).not.toHaveBeenCalled();
  });

  it("no crea una sala cuando otro proceso mantiene el claim del incidente", async () => {
    const dependencies = createDependencies({
      claimRecoveryIncident: vi.fn().mockResolvedValue({ claimed: false }),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.schedule).toHaveBeenCalledWith(expect.any(Function), 120_000);
    expect(dependencies.createReplacementRoom).not.toHaveBeenCalled();
    expect(dependencies.saveRecoveredRoomMapping).not.toHaveBeenCalled();
  });

  it("reemplaza el mapping existente solo despues de reclamar el incidente", async () => {
    const dependencies = createDependencies({
      loadPendingRecoveryCheckpoints: vi.fn().mockResolvedValue([
        { ...validCheckpoint, recoveredRoomId: "lost-recovered-room" },
      ]),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({
      "original-room-1": "recovered-room-1",
    });

    expect(dependencies.claimRecoveryIncident).toHaveBeenCalledBefore(
      dependencies.createReplacementRoom as ReturnType<typeof vi.fn>,
    );
    expect(dependencies.saveRecoveredRoomMapping).toHaveBeenCalledWith({
      gameId: "game-1",
      originalRoomId: "original-room-1",
      recoveredRoomId: "recovered-room-1",
      ownerId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      fence: 1,
    });
  });

  it("reemplaza un mapping vencido con el fence emitido por el claim", async () => {
    const mapping = {
      roomId: "recovered-on-dead-instance",
      ownerId: "00000000-0000-0000-0000-000000000001",
      fence: 4,
      leaseExpiresAt: new Date("2026-07-12T11:59:59.000Z"),
    };
    let ownerId = "00000000-0000-0000-0000-000000000002";
    let claimFence = 4;
    const dependencies: CrashRecoveryDependencies = {
      loadPendingRecoveryCheckpoints: async () => [{ ...validCheckpoint, recoveredRoomId: mapping.roomId }],
      createRecoveryIncident: async () => ({ success: true, recoveryDeadlineAt: validCheckpoint.recoveryDeadlineAt }),
      claimRecoveryIncident: async ({ ownerId: claimant }) => {
        if (mapping.leaseExpiresAt > new Date("2026-07-12T12:00:00.000Z")) return { claimed: false };
        ownerId = claimant;
        claimFence += 1;
        return { claimed: true, fence: claimFence };
      },
      saveRecoveredRoomMapping: async (input) => {
        if (input.ownerId !== ownerId || input.fence !== claimFence || mapping.leaseExpiresAt > new Date("2026-07-12T12:00:00.000Z")) {
          return { success: false, error: "claim sin fence vigente" };
        }
        mapping.roomId = input.recoveredRoomId;
        mapping.fence = input.fence;
        mapping.ownerId = input.ownerId;
        mapping.leaseExpiresAt = new Date("2026-07-12T12:00:30.000Z");
        return { success: true };
      },
      renewRecoveredRoomMappingLease: async () => ({ renewed: true }),
      createReplacementRoom: async () => ({ roomId: "recovered-after-second-crash" }),
      disposeReplacementRoom: async () => undefined,
      deriveRecoveryRefunds: async () => ({ success: true, refunds: [] }),
      expireRecoveryIncidentAndRefund: async () => ({ success: true }),
      markRecoveryIncidentManualReview: async () => ({ success: true }),
      emitRecoveryManualReviewAlert: async () => undefined,
      emitRecoveryInfrastructureAlert: async () => undefined,
      schedule: () => undefined,
      now: () => new Date("2026-07-12T12:00:00.000Z"),
    };

    await expect(new CrashRecoveryService(dependencies).recoverPendingCheckpoints()).resolves.toEqual({
      "original-room-1": "recovered-after-second-crash",
    });

    expect(mapping).toMatchObject({
      roomId: "recovered-after-second-crash",
      fence: 5,
      ownerId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it("destruye la sala de reemplazo si no puede persistir su mapping", async () => {
    const dependencies = createDependencies({
      saveRecoveredRoomMapping: vi.fn().mockResolvedValue({
        success: false,
        error: "database unavailable",
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.disposeReplacementRoom).toHaveBeenCalledWith("recovered-room-1");
  });

  it("reintenta claim, creación y mapping fenced fallido hasta publicarlo", async () => {
    const retries: Array<() => Promise<void>> = [];
    const dependencies = createDependencies({
      claimRecoveryIncident: vi.fn()
        .mockResolvedValueOnce({ claimed: true, fence: 1 })
        .mockResolvedValueOnce({ claimed: true, fence: 2 }),
      createReplacementRoom: vi.fn()
        .mockResolvedValueOnce({ roomId: "recovered-room-stale" })
        .mockResolvedValueOnce({ roomId: "recovered-room-current" }),
      saveRecoveredRoomMapping: vi.fn()
        .mockResolvedValueOnce({ success: false, error: "fence vencido" })
        .mockResolvedValueOnce({ success: true }),
      schedule: vi.fn((callback, delayMs) => {
        if (delayMs !== 120_000) retries.push(callback);
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await expect(service.recoverPendingCheckpoints()).resolves.toEqual({});

    expect(dependencies.disposeReplacementRoom).toHaveBeenCalledWith("recovered-room-stale");
    expect(dependencies.schedule).toHaveBeenCalledWith(expect.any(Function), 1_000);

    await retries[0]?.();

    expect(dependencies.saveRecoveredRoomMapping).toHaveBeenLastCalledWith(expect.objectContaining({
      recoveredRoomId: "recovered-room-current",
      fence: 2,
    }));
  });

  it("reintenta renovar el lease tras un fallo transitorio", async () => {
    const scheduled: Array<{ callback: () => Promise<void>; delayMs: number }> = [];
    const dependencies = createDependencies({
      renewRecoveredRoomMappingLease: vi.fn()
        .mockResolvedValueOnce({ renewed: false, error: "lease ocupado" })
        .mockResolvedValueOnce({ renewed: true }),
      schedule: vi.fn((callback, delayMs) => {
        scheduled.push({ callback, delayMs });
      }),
    });

    await new CrashRecoveryService(dependencies).recoverPendingCheckpoints();
    await scheduled.find(({ delayMs }) => delayMs === 10_000)?.callback();

    expect(scheduled.some(({ delayMs }) => delayMs === 1_000)).toBe(true);
    await scheduled.find(({ delayMs }) => delayMs === 1_000)?.callback();

    expect(dependencies.renewRecoveredRoomMappingLease).toHaveBeenCalledTimes(2);
    expect(scheduled.filter(({ delayMs }) => delayMs === 10_000)).toHaveLength(2);
  });

  it("escala a revisión manual y descarta el replacement si agota la renovación del lease", async () => {
    const scheduled: Array<{ callback: () => Promise<void>; delayMs: number }> = [];
    const dependencies = createDependencies({
      renewRecoveredRoomMappingLease: vi.fn().mockRejectedValue(new Error("database unavailable")),
      schedule: vi.fn((callback, delayMs) => {
        scheduled.push({ callback, delayMs });
      }),
    });

    await new CrashRecoveryService(dependencies).recoverPendingCheckpoints();
    for (const delayMs of [10_000, 1_000, 2_000, 4_000]) {
      await scheduled.find(({ delayMs: scheduledDelay }) => scheduledDelay === delayMs)?.callback();
    }

    expect(dependencies.markRecoveryIncidentManualReview).toHaveBeenCalledWith({
      gameId: "game-1",
      reason: "No se pudo renovar el lease de la sala recuperada: database unavailable",
    });
    expect(dependencies.emitRecoveryManualReviewAlert).toHaveBeenCalledWith({
      gameId: "game-1",
      roomId: "original-room-1",
      reason: "No se pudo renovar el lease de la sala recuperada: database unavailable",
    });
    expect(dependencies.disposeReplacementRoom).toHaveBeenCalledWith("recovered-room-1");
  });

  it("programa la expiración para el deadline absoluto y reembolsa solo importes derivados", async () => {
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      schedule: vi.fn((callback, delayMs) => {
        if (delayMs !== 10_000) expiration = callback;
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await service.recoverPendingCheckpoints();

    expect(dependencies.schedule).toHaveBeenCalledWith(expect.any(Function), 120_000);
    await expiration?.();
    expect(dependencies.deriveRecoveryRefunds).toHaveBeenCalledWith("game-1");
    expect(dependencies.expireRecoveryIncidentAndRefund).toHaveBeenCalledWith({
      gameId: "game-1",
      refunds: [{
        userId: "player-1",
        amountCents: 500_000,
        operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }],
    });
  });

  it("marca manual_review y no acredita cuando los refunds persistidos no son derivables", async () => {
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      deriveRecoveryRefunds: vi.fn().mockResolvedValue({
        success: false,
        error: "ledger incompleto",
      }),
      schedule: vi.fn((callback, delayMs) => {
        if (delayMs !== 10_000) expiration = callback;
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await service.recoverPendingCheckpoints();
    await expiration?.();

    expect(dependencies.expireRecoveryIncidentAndRefund).not.toHaveBeenCalled();
    expect(dependencies.markRecoveryIncidentManualReview).toHaveBeenCalledWith({
      gameId: "game-1",
      reason: "ledger incompleto",
    });
    expect(dependencies.emitRecoveryManualReviewAlert).toHaveBeenCalledWith({
      gameId: "game-1",
      roomId: "original-room-1",
      reason: "ledger incompleto",
    });
  });

  it("reintenta la alerta idempotente cuando manual_review ya estaba persistido", async () => {
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      deriveRecoveryRefunds: vi.fn().mockResolvedValue({ success: false, error: "ledger incompleto" }),
      markRecoveryIncidentManualReview: vi.fn().mockResolvedValue({ success: true, status: "manual_review", updated: false }),
      schedule: vi.fn((callback, delayMs) => { if (delayMs !== 10_000) expiration = callback; }),
    });

    await new CrashRecoveryService(dependencies).recoverPendingCheckpoints();
    await expiration?.();

    expect(dependencies.emitRecoveryManualReviewAlert).toHaveBeenCalledTimes(1);
  });

  it("cierra la sala de reemplazo cuando el deadline cancela y reembolsa el incidente", async () => {
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      schedule: vi.fn((callback, delayMs) => {
        if (delayMs !== 10_000) expiration = callback;
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await service.recoverPendingCheckpoints();
    await expiration?.();

    expect(dependencies.disposeReplacementRoom).toHaveBeenCalledWith("recovered-room-1");
  });

  it("conserva la sala de reemplazo si el callback del deadline encuentra el incidente resumed", async () => {
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      schedule: vi.fn((callback) => {
        expiration = callback;
      }),
      expireRecoveryIncidentAndRefund: vi.fn().mockResolvedValue({
        success: true,
        status: "resumed",
      }),
    });
    const service = new CrashRecoveryService(dependencies);

    await service.recoverPendingCheckpoints();
    await expiration?.();

    expect(dependencies.disposeReplacementRoom).not.toHaveBeenCalled();
  });
});
