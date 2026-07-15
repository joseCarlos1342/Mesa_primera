import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  CrashRecoveryService,
  type CrashRecoveryDependencies,
} from "../CrashRecoveryService";
import { stableJson } from "../RecoveryPolicy";
import { createRecoveryMetrics, createRecoveryObserver } from "../RecoveryObservability";

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
    claimRecoveryIncident: vi.fn().mockResolvedValue({ claimed: true }),
    saveRecoveredRoomMapping: vi.fn().mockResolvedValue({ success: true }),
    createReplacementRoom: vi.fn().mockResolvedValue({ roomId: "recovered-room-1" }),
    disposeReplacementRoom: vi.fn().mockResolvedValue(undefined),
    deriveRecoveryRefunds: vi.fn().mockResolvedValue({
      success: true,
      refunds: [{ userId: "player-1", amountCents: 500_000 }],
    }),
    expireRecoveryIncidentAndRefund: vi.fn().mockResolvedValue({ success: true, status: "cancelled_crash" }),
    markRecoveryIncidentManualReview: vi.fn().mockResolvedValue({ success: true, status: "manual_review" }),
    emitRecoveryManualReviewAlert: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn(),
    now: () => new Date("2026-07-12T12:00:00.000Z"),
    ...overrides,
  };
}

describe("CrashRecoveryService", () => {
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
    });
  });

  it("registra el lifecycle de una recuperación completada", async () => {
    const metrics = createRecoveryMetrics();
    const observer = createRecoveryObserver({ metrics, logger: { log: vi.fn() } });
    const service = new CrashRecoveryService(createDependencies(), observer);

    await service.recoverPendingCheckpoints();

    expect(metrics.snapshot()).toMatchObject({
      recovery_detected_total: 1,
      replacement_created_total: 1,
      roster_completed_total: 1,
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
      schedule: vi.fn((callback) => {
        expiration = callback;
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

  it("programa la expiración para el deadline absoluto y reembolsa solo importes derivados", async () => {
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      schedule: vi.fn((callback) => {
        expiration = callback;
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
      schedule: vi.fn((callback) => {
        expiration = callback;
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

  it("cierra la sala de reemplazo cuando el deadline cancela y reembolsa el incidente", async () => {
    let expiration: (() => Promise<void>) | undefined;
    const dependencies = createDependencies({
      schedule: vi.fn((callback) => {
        expiration = callback;
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
