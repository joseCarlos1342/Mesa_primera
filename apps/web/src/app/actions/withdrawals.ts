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
  if (amount_cents <= 0 || amount_cents % 100000 !== 0) return { error: 'El monto debe ser múltiplo de $1.000 COP' }
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

  // 1. Fetch pending requests
  const { data: requests, error: requestsError } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (requestsError) return { error: requestsError.message }
  if (!requests || requests.length === 0) return { withdrawals: [] }

  const userIds = requests.map(r => r.user_id).filter(Boolean) as string[]

  // 2. Fetch profiles and wallets separately
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

  const adaptedData = requests.map((w: any) => {
    const profile = profileMap.get(w.user_id)
    const rawUsername = profile?.username || 'Jugador'
    const cleanUsername = rawUsername.startsWith('@') ? rawUsername.substring(1) : rawUsername
    const userBalance = walletMap.get(w.user_id) || 0

    return {
      ...w,
      userName: cleanUsername,
      amount: w.amount_cents,
      userBalance: userBalance
    }
  });

  return { withdrawals: adaptedData }
}
