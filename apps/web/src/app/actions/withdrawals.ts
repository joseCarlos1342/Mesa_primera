'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function requestWithdrawal(amount: number, bankDetails: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No authenticated' }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance_cents')
    .eq('user_id', user.id)
    .single()

  const amount_cents = Math.round(amount * 100)

  if (!wallet) return { error: 'Wallet not found' }
  if (Number(wallet.balance_cents) < amount_cents) return { error: 'Saldo insuficiente' }

  // 1. Create PENDING withdrawal request
  const { error } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      amount_cents: amount_cents,
      bank_info: bankDetails,
      status: 'pending'
    })

  if (error) return { error: error.message }
  
  revalidatePath('/wallet')
  return { success: true }
}

export async function getPendingWithdrawals() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*, profiles(username), wallets:user_id(balance_cents)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  
  // Return cleaner data structure
  const adaptedData = data?.map((w: any) => {
    const rawUsername = w.profiles?.username || 'Jugador'
    // Remove any leading @ to avoid double @@ in UI
    const cleanUsername = rawUsername.startsWith('@') ? rawUsername.substring(1) : rawUsername

    return {
      ...w,
      userName: cleanUsername,
      amount: w.amount_cents,
      userBalance: w.wallets?.balance_cents || 0
    }
  });

  return { withdrawals: adaptedData }
}
