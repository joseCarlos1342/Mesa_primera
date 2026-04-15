"use server";

import { createClient } from "@/utils/supabase/server";
import { redis } from "@/utils/redis";
import { logAdminAction } from "./admin-audit";

const TOKEN_TTL_SECONDS = 60; // 1 minute — just enough for the client to connect

async function ensureAdmin(supabase: any): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("No autenticado");

  const { data: userRecord } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (userRecord?.role !== "admin") throw new Error("Acceso denegado");
  return userData.user.id;
}

/**
 * Genera un token de supervisión de corta vida para que el admin
 * pueda unirse como espectador a una sala específica de Colyseus.
 * El token se almacena en Redis con TTL de 60 segundos.
 */
export async function generateSupervisionToken(roomId: string): Promise<{
  token: string;
}> {
  const supabase = await createClient();
  const adminId = await ensureAdmin(supabase);

  if (!roomId) throw new Error("roomId es obligatorio");

  const token = crypto.randomUUID();
  const payload = JSON.stringify({ adminId, roomId });

  await redis.setex(`supervision:${token}`, TOKEN_TTL_SECONDS, payload);

  await logAdminAction(adminId, "supervision_token_generated", "room", roomId, {
    token_ttl: TOKEN_TTL_SECONDS,
  });

  return { token };
}
