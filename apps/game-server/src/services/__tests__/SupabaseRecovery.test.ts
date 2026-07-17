import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SUPABASE_URL = "http://localhost:54321";
  return { mockRpc: vi.fn() };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc })),
}));

vi.mock("../ReplayFileService", () => ({
  ReplayFileService: {},
}));

vi.mock("../redis", () => ({ redis: {} }));

import { SupabaseService } from "../SupabaseService";

describe("SupabaseService recovery queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga checkpoints pendientes tipados mediante la RPC protegida", async () => {
    mockRpc.mockResolvedValue({
      data: [{
        game_id: "game-1",
        room_id: "room-1",
        checkpoint_version: 4,
        state_hash: "sha256:state",
        private_state: { phase: "PIQUE" },
        roster_user_ids: ["player-1", "player-2"],
        recovery_deadline_at: "2026-07-12T12:02:00.000Z",
      }],
      error: null,
    });

    await expect(SupabaseService.loadPendingRecoveryCheckpoints()).resolves.toEqual([
      {
        gameId: "game-1",
        roomId: "room-1",
        checkpointVersion: 4,
        stateHash: "sha256:state",
        privateState: { phase: "PIQUE" },
        rosterUserIds: ["player-1", "player-2"],
        recoveryDeadlineAt: new Date("2026-07-12T12:02:00.000Z"),
      },
    ]);
    expect(mockRpc).toHaveBeenCalledWith("load_pending_game_recovery_checkpoints_v2");
  });

  it("propaga el fallo de la RPC para no confundirlo con una lista vacía", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("database unavailable") });

    await expect(SupabaseService.loadPendingRecoveryCheckpoints()).rejects.toThrow("database unavailable");
  });

  it("guarda la sala recuperada en el incidente", async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    await expect(SupabaseService.saveRecoveredRoomMapping({
      gameId: "game-1",
      originalRoomId: "room-1",
      recoveredRoomId: "room-recovered-1",
      ownerId: "a66cbb59-c03c-4db5-83f4-6517e9018e8f",
      fence: 1,
    })).resolves.toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("save_game_recovery_room_mapping", {
      p_game_id: "game-1",
      p_original_room_id: "room-1",
      p_recovered_room_id: "room-recovered-1",
      p_owner_id: "a66cbb59-c03c-4db5-83f4-6517e9018e8f",
      p_claim_fence: 1,
    });
  });

  it("reclama un incidente pendiente con un owner de proceso", async () => {
    mockRpc.mockResolvedValue({ data: { claimed: true, fence: 1 }, error: null });

    await expect(SupabaseService.claimRecoveryIncident({
      gameId: "game-1",
      ownerId: "a66cbb59-c03c-4db5-83f4-6517e9018e8f",
    })).resolves.toEqual({ claimed: true, fence: 1 });
    expect(mockRpc).toHaveBeenCalledWith("claim_game_recovery_incident", {
      p_game_id: "game-1",
      p_owner_id: "a66cbb59-c03c-4db5-83f4-6517e9018e8f",
    });
  });

  it("expone el deadline absoluto y deriva refunds desde la RPC protegida", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: { success: true, recovery_deadline_at: "2026-07-12T12:02:00.000Z" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ user_id: "player-1", amount_cents: 500_000 }],
        error: null,
      });

    const incident = await SupabaseService.createRecoveryIncident({
      gameId: "game-1",
      roomId: "room-1",
      detectedAt: new Date("2026-07-12T12:00:00.000Z"),
      causeCode: "process_restart",
    });
    await expect(SupabaseService.deriveRecoveryRefunds("game-1")).resolves.toEqual({
      success: true,
      refunds: [{ userId: "player-1", amountCents: 500_000 }],
    });

    expect(incident.recoveryDeadlineAt).toEqual(new Date("2026-07-12T12:02:00.000Z"));
    expect(mockRpc).toHaveBeenLastCalledWith("derive_game_recovery_refunds", {
      p_game_id: "game-1",
    });
  });

  it("marca manual_review exclusivamente mediante la RPC protegida", async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    await expect(SupabaseService.markRecoveryIncidentManualReview({
      gameId: "game-1",
      reason: "ledger incompleto",
    })).resolves.toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("mark_game_recovery_incident_manual_review", {
      p_game_id: "game-1",
      p_reason: "ledger incompleto",
    });
  });

  it("solo considera resuelta una recuperación si la RPC fenced actualiza el incidente pending", async () => {
    mockRpc.mockResolvedValue({ data: { success: true, updated: false }, error: null });

    await expect(SupabaseService.resolveRecoveryIncident({
      gameId: "game-1",
      recoveredRoomId: "recovered-room-1",
      ownerId: "a66cbb59-c03c-4db5-83f4-6517e9018e8f",
      fence: 4,
    })).resolves.toEqual({
      success: true,
      updated: false,
    });
    expect(mockRpc).toHaveBeenCalledWith("resolve_game_recovery_incident", {
      p_game_id: "game-1",
      p_recovered_room_id: "recovered-room-1",
      p_owner_id: "a66cbb59-c03c-4db5-83f4-6517e9018e8f",
      p_claim_fence: 4,
    });
  });
});
