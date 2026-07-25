import { RoomServiceClient } from "livekit-server-sdk";

function liveKitHttpUrl(): string | null {
  const value = process.env.LIVEKIT_URL?.trim();
  if (!value) return null;
  return value.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

export class LiveKitModerationService {
  static async muteParticipant(roomName: string, identity: string): Promise<boolean> {
    const url = liveKitHttpUrl();
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret || !roomName || !identity) return false;

    try {
      const roomService = new RoomServiceClient(url, apiKey, apiSecret);
      const participant = await roomService.getParticipant(roomName, identity);
      await Promise.all(
        participant.tracks.map((track) =>
          roomService.mutePublishedTrack(roomName, identity, track.sid, true)
        )
      );
      await roomService.updateParticipant(roomName, identity, {
        permission: { canPublish: false },
      });
      return true;
    } catch (error) {
      console.error("[LiveKitModerationService] Error silencing participante:", error);
      return false;
    }
  }

  static async unmuteParticipant(roomName: string, identity: string): Promise<boolean> {
    const url = liveKitHttpUrl();
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret || !roomName || !identity) return false;

    try {
      const roomService = new RoomServiceClient(url, apiKey, apiSecret);
      const participant = await roomService.getParticipant(roomName, identity);
      await Promise.all(
        participant.tracks.map((track) =>
          roomService.mutePublishedTrack(roomName, identity, track.sid, false)
        )
      );
      await roomService.updateParticipant(roomName, identity, {
        permission: { canPublish: true },
      });
      return true;
    } catch (error) {
      console.error("[LiveKitModerationService] Error reactivando participante:", error instanceof Error ? error.name : "unknown");
      return false;
    }
  }
}
