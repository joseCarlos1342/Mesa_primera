"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const roomIdSchema = z.string().trim().min(1).max(128);
const recoveryResultSchema = z.object({
  status: z.enum(["recovery_pending", "resumed"]),
  recovered_room_id: z.string().trim().min(1).max(128),
  recovery_deadline_at: z.string().datetime(),
});

export type RecoveredRoom = {
  status: "recovery_pending" | "resumed";
  recoveredRoomId: string;
  deadline: string;
};

export async function resolveRecoveredRoom(roomIdInput: string): Promise<RecoveredRoom | null> {
  const roomId = roomIdSchema.safeParse(roomIdInput);
  if (!roomId.success) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("resolve_player_recovery_room", {
    p_original_room_id: roomId.data,
  });
  if (error || !Array.isArray(data)) return null;

  const result = recoveryResultSchema.safeParse(data[0]);
  if (!result.success) return null;

  return {
    status: result.data.status,
    recoveredRoomId: result.data.recovered_room_id,
    deadline: result.data.recovery_deadline_at,
  };
}
