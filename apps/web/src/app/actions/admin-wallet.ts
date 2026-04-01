'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processTransaction(requestId: string, status: 'completed' | 'failed') {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('process_admin_transaction', {
    p_request_id: requestId,
    p_status: status
  });

  if (error) {
    console.error('RPC Error:', error);
    return { error: error.message };
  }

  if (data && data.error) {
    return { error: data.error };
  }

  revalidatePath('/admin/deposits');
  revalidatePath('/admin/withdrawals');
  revalidatePath('/wallet');
  
  return { success: true };
}

export async function getPendingDeposits() {
  const supabase = await createClient()

  // 1. Fetch pending requests
  const { data: requests, error: requestsError } = await supabase
    .from('deposit_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (requestsError) return { error: requestsError.message }
  if (!requests || requests.length === 0) return { deposits: [] }

  const userIds = requests.map(r => r.user_id).filter(Boolean) as string[]

  // 2. Fetch profiles and wallets separately to avoid join issues
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds)

  const { data: wallets } = await supabase
    .from('wallets')
    .select('user_id, balance_cents')
    .in('user_id', userIds)

  // 3. Create maps for lookups
  const profileMap = new Map(profiles?.map(p => [p.id, p]))
  const walletMap = new Map(wallets?.map(w => [w.user_id, w.balance_cents]))

  const adaptedData = requests.map((d: any) => {
    const profile = profileMap.get(d.user_id)
    const rawUsername = profile?.username || 'Jugador'
    const cleanUsername = rawUsername.startsWith('@') ? rawUsername.substring(1) : rawUsername
    const userBalance = walletMap.get(d.user_id) || 0

    return {
      ...d,
      userName: cleanUsername,
      amount: d.amount_cents,
      userBalance: userBalance
    }
  });

  return { deposits: adaptedData }
}
