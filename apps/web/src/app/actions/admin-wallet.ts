'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processTransaction(transactionId: string, status: 'completed' | 'failed') {
  const supabase = await createClient()

  // 1. Get Transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('*, wallets(balance, id)')
    .eq('id', transactionId)
    .single()

  if (txError || !tx) return { error: 'Transacción no encontrada' }
  if (tx.status !== 'pending') return { error: 'La transacción ya fue procesada' }

  if (status === 'completed') {
    // 2. Update Balance if it's a withdrawal or deposit
    // El balance se actualiza sumando el 'amount' (que es negativo para retiros y positivo para depósitos)
    const newBalance = Number(tx.wallets.balance) + Number(tx.amount)

    if (newBalance < 0 && tx.amount < 0) {
      return { error: 'Saldo insuficiente tras la operación' }
    }

    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', tx.wallet_id)

    if (updateError) return { error: updateError.message }
  }

  // 3. Mark transaction as processed
  const { error: statusError } = await supabase
    .from('transactions')
    .update({ status })
    .eq('id', transactionId)

  if (statusError) return { error: statusError.message }

  revalidatePath('/admin/deposits')
  revalidatePath('/admin/withdrawals')
  revalidatePath('/wallet')
  
  return { success: true }
}

export async function getPendingDeposits() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*, wallets(profiles(username))')
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { deposits: data }
}
