"use server";

import { createClient } from "@/utils/supabase/server";

export type BonusTier = {
  id: number;
  name: string;
  min_rake_cents: number;
  bonus_amount_cents: number;
  unlocked: boolean;
  claimed: boolean;
};

export type BonusStatus = {
  period: string;
  monthly_rake_cents: number;
  tiers: BonusTier[];
};

export async function getBonusStatus(): Promise<BonusStatus | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase.rpc("get_bonus_status", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error fetching bonus status:", error);
    return null;
  }

  if (data?.error) {
    console.error("RPC error in get_bonus_status:", data.error);
    return null;
  }

  return data as BonusStatus;
}

export async function claimBonus(
  tierId: number
): Promise<{
  success?: boolean;
  error?: string;
  claim_id?: string;
  bonus_amount_cents?: number;
  balance_after?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase.rpc("claim_bonus", {
    p_tier_id: tierId,
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return data;
}
