'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processTransaction(requestId: string, status: 'completed' | 'failed') {
  const supabase = await createClient()

  // 1. Determine if it's a deposit or withdrawal
  let type: 'deposit' | 'withdrawal' | null = null;
  let request: any = null;

  // Try deposit first
  const { data: dep } = await supabase.from('deposit_requests').select('*, profiles(id)').eq('id', requestId).single();
  if (dep) {
    type = 'deposit';
    request = dep;
  } else {
    // Try withdrawal
    const { data: wit } = await supabase.from('withdrawal_requests').select('*, profiles(id)').eq('id', requestId).single();
    if (wit) {
      type = 'withdrawal';
      request = wit;
    }
  }

  if (!request) return { error: 'Solicitud no encontrada' }
  if (request.status !== 'pending') return { error: 'La solicitud ya fue procesada' }

  const userId = request.user_id;

  if (status === 'completed') {
    // 2. Get Wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance_cents')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) return { error: 'Wallet no encontrada' }

    const amount = Number(request.amount_cents || 0);
    let newBalance = Number(wallet.balance_cents);

    if (type === 'deposit') {
      newBalance += amount;
    } else {
      if (newBalance < amount) return { error: 'Saldo insuficiente' }
      newBalance -= amount;
    }

    // 3. Update Balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance_cents: newBalance })
      .eq('id', wallet.id)

    if (updateError) return { error: updateError.message }

    // 4. Create Ledger Entry
    const { error: ledgerError } = await supabase.from('ledger').insert({
      user_id: userId,
      amount_cents: amount,
      type: type,
      direction: type === 'deposit' ? 'credit' : 'debit',
      balance_after_cents: newBalance,
      reference_id: requestId
    });

    if (ledgerError) {
      console.error('Ledger Error:', ledgerError);
      // Optional: Rollback balance if ledger fails? 
      // For now, at least return the error so UI knows something went wrong
      return { error: 'Error al registrar en el historial: ' + ledgerError.message }
    }
  }

  // 5. Update Request Status
  const tableName = type === 'deposit' ? 'deposit_requests' : 'withdrawal_requests';
  const { error: statusError } = await supabase
    .from(tableName)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (statusError) return { error: statusError.message }

  revalidatePath('/admin/deposits')
  revalidatePath('/admin/withdrawals')
  revalidatePath('/wallet')
  
  return { success: true }
}

export async function getPendingDeposits() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deposit_requests')
    .select('*, profiles(username), wallets:user_id(balance_cents)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  
  const adaptedData = data?.map((d: any) => {
    const rawUsername = d.profiles?.username || 'Jugador'
    const cleanUsername = rawUsername.startsWith('@') ? rawUsername.substring(1) : rawUsername

    return {
      ...d,
      userName: cleanUsername,
      amount: d.amount_cents,
      userBalance: d.wallets?.balance_cents || 0
    }
  });

  return { deposits: adaptedData }
}
