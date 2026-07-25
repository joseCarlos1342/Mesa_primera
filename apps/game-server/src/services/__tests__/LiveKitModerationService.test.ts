import { beforeEach, describe, expect, it, vi } from "vitest";

const { getParticipant, mutePublishedTrack, updateParticipant, RoomServiceClient } = vi.hoisted(() => ({
  getParticipant: vi.fn(),
  mutePublishedTrack: vi.fn(),
  updateParticipant: vi.fn(),
  RoomServiceClient: vi.fn(),
}));

vi.mock("livekit-server-sdk", () => ({
  RoomServiceClient: class {
    constructor(...args: unknown[]) {
      RoomServiceClient(...args);
    }
    getParticipant = getParticipant;
    mutePublishedTrack = mutePublishedTrack;
    updateParticipant = updateParticipant;
  },
}));

import { LiveKitModerationService } from "../LiveKitModerationService";

describe("LiveKitModerationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVEKIT_URL = "wss://voice.example.com";
    process.env.LIVEKIT_API_KEY = "key";
    process.env.LIVEKIT_API_SECRET = "secret";
    getParticipant.mockResolvedValue({ tracks: [{ sid: "TR_AUDIO" }] });
    mutePublishedTrack.mockResolvedValue({});
  });

  it("silencia todas las pistas publicadas por el jugador", async () => {
    await expect(LiveKitModerationService.muteParticipant("room-1", "user-1")).resolves.toBe(true);

    expect(RoomServiceClient).toHaveBeenCalledWith("https://voice.example.com", "key", "secret");
    expect(getParticipant).toHaveBeenCalledWith("room-1", "user-1");
    expect(mutePublishedTrack).toHaveBeenCalledWith("room-1", "user-1", "TR_AUDIO", true);
    expect(updateParticipant).toHaveBeenCalledWith("room-1", "user-1", {
      permission: { canPublish: false },
    });
  });

  it("reactiva publicación y desmutea las pistas del jugador", async () => {
    await expect(LiveKitModerationService.unmuteParticipant("room-1", "user-1")).resolves.toBe(true);

    expect(mutePublishedTrack).toHaveBeenCalledWith("room-1", "user-1", "TR_AUDIO", false);
    expect(updateParticipant).toHaveBeenCalledWith("room-1", "user-1", {
      permission: { canPublish: true },
    });
  });

  it("falla cerrado cuando LiveKit no está configurado o no responde", async () => {
    delete process.env.LIVEKIT_API_SECRET;
    await expect(LiveKitModerationService.muteParticipant("room-1", "user-1")).resolves.toBe(false);

    process.env.LIVEKIT_API_SECRET = "secret";
    getParticipant.mockRejectedValue(new Error("LiveKit unavailable"));
    await expect(LiveKitModerationService.muteParticipant("room-1", "user-1")).resolves.toBe(false);
  });
});
