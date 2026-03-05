'use server'

import { createClient } from '@/utils/supabase/server'

export async function getWalletData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No authenticated' }

  // 1. Get Wallet Balance
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (walletError) return { error: walletError.message }

  // 2. Get Transaction History (Ledger)
  // Nota: En el esquema inicial la tabla se llama 'transactions' 
  // pero el plan se refiere a ella como el Ledger.
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (txError) return { error: txError.message }

  return { wallet, transactions }
}

export async function createDepositRequest(amount: number, proofUrl: string) {
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
    .from('transactions')
    .insert({
      wallet_id: wallet.id,
      user_id: user.id,
      amount,
      type: 'deposit',
      status: 'pending',
      reference_id: null, // proofUrl se almacena en Storage, path: user_id/timestamp_filename
    })

  if (error) return { error: error.message }
  return { success: true, proofUrl }
}
