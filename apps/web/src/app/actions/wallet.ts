'use server'

import { createClient } from '@/utils/supabase/server'
import { depositAmountSchema, observationsSchema } from '@/lib/validations'

export async function getWalletData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No authenticated' }

  // 1. Get Wallet Balance
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (walletError) return { error: walletError.message }
  if (!wallet) {
    // Should be created by trigger, but handle as fallback
    const { data: newWallet } = await supabase
      .from('wallets')
      .insert({ user_id: user.id, balance_cents: 0, currency: 'COP' })
      .select()
      .single()
    return { wallet: newWallet, transactions: [] }
  }

  // 2. Get Realized Ledger Entries
  const { data: ledger, error: ledgerError } = await supabase
    .from('ledger')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // 3. Get Pending/Rejected Deposit Requests
  const { data: depositRequests } = await supabase
    .from('deposit_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 4. Get Withdrawal Requests
  const { data: withdrawalRequests } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (ledgerError) return { error: ledgerError.message }

  // 5. Merge and Normalize Activity
  const activities: any[] = [
    ...(ledger || []).map(tx => ({
      id: tx.id,
      type: tx.type,
      amount_cents: tx.amount_cents,
      status: 'completed',
      created_at: tx.created_at
    })),
    ...(depositRequests || []).filter(dr => dr.status !== 'completed').map(dr => ({
      id: dr.id,
      type: 'deposit',
      amount_cents: dr.amount_cents,
      status: dr.status,
      created_at: dr.created_at,
      proof_url: dr.proof_url,
      observations: dr.observations
    })),
    ...(withdrawalRequests || []).filter(wr => wr.status !== 'completed').map(wr => ({
      id: wr.id,
      type: 'withdrawal',
      amount_cents: wr.amount_cents,
      status: wr.status,
      created_at: wr.created_at,
      observations: wr.observations
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { wallet, transactions: activities.slice(0, 20) }
}

export async function createDepositRequest(amount: number, proofUrl: string, observations?: string) {
  const amountParsed = depositAmountSchema.safeParse(Math.round(amount))
  if (!amountParsed.success) {
    return { error: amountParsed.error.issues?.[0]?.message ?? 'Monto inválido' }
  }

  const obsParsed = observationsSchema.safeParse(observations)
  const cleanObservations = obsParsed.success ? obsParsed.data : ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No authenticated' }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!wallet) return { error: 'Wallet not found' }

  const { error } = await supabase
    .from('deposit_requests')
    .insert({
      user_id: user.id,
      amount_cents: amountParsed.data * 100,
      status: 'pending',
      proof_url: proofUrl,
      observations: cleanObservations || null,
    })

  if (error) return { error: error.message }
  return { success: true, proofUrl }
}
