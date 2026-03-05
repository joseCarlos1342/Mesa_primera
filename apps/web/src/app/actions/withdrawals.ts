'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function requestWithdrawal(amount: number, bankDetails: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No authenticated' }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .single()

  if (!wallet) return { error: 'Wallet not found' }
  if (Number(wallet.balance) < amount) return { error: 'Saldo insuficiente' }

  // 1. Create PENDING withdrawal transaction
  // IMPORTANTE: En un retiro, el saldo se "congela" o se debita al aprobar.
  // Aquí lo debitaremos al aprobar para evitar discrepancias si se rechaza.
  
  const { error } = await supabase
    .from('transactions')
    .insert({
      wallet_id: wallet.id,
      amount: -amount, // Negativo porque es un egreso
      type: 'withdrawal',
      status: 'pending',
      // Guardamos info del banco en una columna de metadata si existiera, 
      // por ahora lo manejaremos como referencia o descripción
    })

  if (error) return { error: error.message }
  
  revalidatePath('/wallet')
  return { success: true }
}

export async function getPendingWithdrawals() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*, wallets(profiles(username))')
    .eq('type', 'withdrawal')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { withdrawals: data }
}
