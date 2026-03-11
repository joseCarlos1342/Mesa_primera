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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) return { error: 'Wallet no encontrada' }

    const amount = Number(request.amount_cents || 0);
    let newBalance = Number(wallet.balance);

    if (type === 'deposit') {
      newBalance += amount;
    } else {
      if (newBalance < amount) return { error: 'Saldo insuficiente' }
      newBalance -= amount;
    }

    // 3. Update Balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id)

    if (updateError) return { error: updateError.message }

    // 4. Create Ledger Entry
    await supabase.from('ledger').insert({
      user_id: userId,
      amount_cents: amount,
      type: type,
      direction: type === 'deposit' ? 'credit' : 'debit',
      balance_after_cents: newBalance,
      reference_id: requestId
    });
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
    .select('*, profiles(username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  
  // Adapt to old UI expectations if necessary (wallets.profiles -> profiles)
  // The UI expects dep.wallets.profiles.username
  const adaptedData = data?.map(d => ({
     ...d,
     amount: d.amount_cents / 1, // keeping it as bits
     wallets: { profiles: d.profiles }
  }));

  return { deposits: adaptedData }
}
