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

  // 1. Create PENDING withdrawal request
  const { error } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      amount_cents: amount,
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
    .select('*, profiles(username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  
  // Adapt to UI expectation: wit.wallets.profiles.username
  const adaptedData = data?.map(w => ({
    ...w,
    amount: w.amount_cents,
    wallets: { profiles: w.profiles }
  }));

  return { withdrawals: adaptedData }
}
