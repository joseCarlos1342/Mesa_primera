import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { CrashRecoveryService, type CrashRecoveryDependencies } from "../CrashRecoveryService";
import { stableJson } from "../RecoveryPolicy";
import { MesaRoom, type RecoverySnapshotV1 } from "../../rooms/MesaRoom";
import { getAvailableTestPort } from "../../rooms/__tests__/mesa-room-test-helpers";

vi.mock("../../services/redis", () => ({
  createRedisSubscriber: vi.fn(() => ({
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    on: vi.fn(),
  })),
}));

vi.mock("../../services/AlertService", () => ({
  AlertService: {
    emitAsync: vi.fn().mockResolvedValue(undefined),
    refundFailed: vi.fn().mockResolvedValue(undefined),
    identity: vi.fn(),
  },
}));

vi.mock("../../services/SupabaseService", () => ({
  SupabaseService: {
    validateRecoveryIdentity: vi.fn().mockResolvedValue(true),
    checkTableAccess: vi.fn().mockResolvedValue({ blocked: false }),
    resolveRecoveryIncident: vi.fn().mockResolvedValue({ success: true, updated: true }),
  },
}));

const now = new Date("2026-07-12T12:00:00.000Z");
const deadline = new Date("2026-07-12T12:02:00.000Z");

describe("CrashRecoveryService chaos recovery", () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await boot({
      initializeGameServer: (gameServer) => {
        gameServer.define("mesa_primera", MesaRoom);
      },
    }, await getAvailableTestPort());
  });

  afterAll(async () => {
    await colyseus?.cleanup();
  });

  it("reconstruye desde un checkpoint, exige el roster y desbloquea tras el rejoin completo", async () => {
    const checkpoint = await createCheckpointFromLiveRoom(colyseus, "chaos-roster");
    let replacementRoomId = "";
    let replacementTestRoom: Parameters<ColyseusTestServer["connectTo"]>[0];
    const dependencies = createInMemoryDependencies(checkpoint, {
      createReplacementRoom: async ({ recovery }) => {
        const replacement = await colyseus.createRoom<any>("mesa_primera", { recovery });
        replacementRoomId = replacement.roomId;
        replacementTestRoom = replacement;
        return { roomId: replacement.roomId };
      },
    });

    const recoveredRooms = await new CrashRecoveryService(dependencies).recoverPendingCheckpoints();
    expect(recoveredRooms).toEqual({ [checkpoint.roomId]: replacementRoomId });

    const replacement = colyseus.getRoomById(replacementRoomId) as MesaRoom;
    expect(replacement.recoveryLocked).toBe(true);
    expect(replacement.autoDispose).toBe(false);
    expect(replacement.state.players.size).toBe(3);

    await expect(colyseus.connectTo(replacementTestRoom, {
      userId: "outsider",
      nickname: "Outsider",
      avatarUrl: "outsider",
      chips: 10_000_000,
    })).rejects.toThrow("recuperación");

    for (const userId of checkpoint.rosterUserIds) {
      await colyseus.connectTo(replacementTestRoom, {
        userId,
        nickname: userId,
        avatarUrl: "default",
        chips: 10_000_000,
      });
    }

    expect(replacement.recoveryLocked).toBe(false);
    expect(replacement.autoDispose).toBe(true);
    expect(replacement.state.players.size).toBe(3);
    expect(Array.from(replacement.state.players.values()).every((player) => player.connected)).toBe(true);
  });

  it("ante un segundo crash y deadline con roster incompleto no duplica replacement ni refunds", async () => {
    const checkpoint = await createCheckpointFromLiveRoom(colyseus, "chaos-deadline");
    const scheduled: Array<() => Promise<void>> = [];
    const createdRooms: string[] = [];
    const claimedGames = new Set<string>();
    const appliedRefundOperations = new Set<string>();
    const persistedRefunds: Array<{ userId: string; operationId: string }> = [];
    const dependencies = createInMemoryDependencies(checkpoint, {
      claimRecoveryIncident: async ({ gameId }) => {
        if (claimedGames.has(gameId)) return { claimed: false };
        claimedGames.add(gameId);
        return { claimed: true };
      },
      createReplacementRoom: async ({ recovery }) => {
        const replacement = await colyseus.createRoom<any>("mesa_primera", { recovery });
        createdRooms.push(replacement.roomId);
        return { roomId: replacement.roomId };
      },
      schedule: (callback) => {
        scheduled.push(callback);
      },
      expireRecoveryIncidentAndRefund: async ({ refunds }) => {
        for (const refund of refunds) {
          if (appliedRefundOperations.has(refund.operationId)) continue;
          appliedRefundOperations.add(refund.operationId);
          persistedRefunds.push(refund);
        }
        return { success: true };
      },
    });

    await new CrashRecoveryService(dependencies).recoverPendingCheckpoints();
    await new CrashRecoveryService(dependencies).recoverPendingCheckpoints();

    expect(createdRooms).toHaveLength(1);
    expect(scheduled).toHaveLength(2);

    await Promise.all(scheduled.map((expire) => expire()));

    expect(persistedRefunds).toHaveLength(3);
    expect(new Set(persistedRefunds.map((refund) => refund.operationId))).toHaveLength(3);
    expect(new Set(persistedRefunds.map((refund) => refund.userId))).toEqual(new Set(checkpoint.rosterUserIds));
  });
});

async function createCheckpointFromLiveRoom(
  colyseus: ColyseusTestServer,
  tableId: string,
) {
  const room = await colyseus.createRoom<any>("mesa_primera", { tableId });
  const rosterUserIds = ["recovery-a", "recovery-b", "recovery-c"];

  for (const userId of rosterUserIds) {
    await colyseus.connectTo(room, {
      userId,
      nickname: userId,
      avatarUrl: "default",
      chips: 10_000_000,
    });
  }

  const source = colyseus.getRoomById(room.roomId) as MesaRoom;
  source.state.phase = "APUESTA_4_CARTAS";
  source.state.pot = 1_500_000;
  source.recoveryRosterUserIds = rosterUserIds;
  source.currentGameId = `game-${tableId}`;

  const privateState = (source as unknown as { createRecoverySnapshot: () => RecoverySnapshotV1 })
    .createRecoverySnapshot();

  return {
    gameId: source.currentGameId,
    roomId: room.roomId,
    checkpointVersion: 1,
    stateHash: createHash("sha256").update(stableJson(privateState)).digest("hex"),
    privateState,
    rosterUserIds,
    recoveryDeadlineAt: deadline,
  };
}

function createInMemoryDependencies(
  checkpoint: Awaited<ReturnType<typeof createCheckpointFromLiveRoom>>,
  overrides: Partial<CrashRecoveryDependencies> = {},
): CrashRecoveryDependencies {
  return {
    loadPendingRecoveryCheckpoints: async () => [checkpoint],
    createRecoveryIncident: async () => ({ success: true, recoveryDeadlineAt: deadline }),
    claimRecoveryIncident: async () => ({ claimed: true }),
    saveRecoveredRoomMapping: async () => ({ success: true }),
    createReplacementRoom: async () => ({ roomId: "unused" }),
    disposeReplacementRoom: async () => undefined,
    deriveRecoveryRefunds: async () => ({
      success: true,
      refunds: checkpoint.rosterUserIds.map((userId) => ({ userId, amountCents: 500_000 })),
    }),
    expireRecoveryIncidentAndRefund: async () => ({ success: true }),
    markRecoveryIncidentManualReview: async () => ({ success: true }),
    emitRecoveryManualReviewAlert: async () => undefined,
    schedule: () => undefined,
    now: () => now,
    ...overrides,
  };
}
