'use server'

import { createClient } from '@/utils/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { z } from 'zod'

const phoneSchema = z.string().min(6).max(20).regex(/^\+?[0-9\s-]+$/, 'Número de teléfono inválido')

const transferSchema = z.object({
  recipientId: z.string().uuid('ID de destinatario inválido'),
  amountCents: z.number().int().min(100000, 'El monto mínimo es $1.000')
    .refine(v => v % 100000 === 0, 'El monto debe ser múltiplo de $1.000 COP'),
})

/**
 * Busca un usuario por número de teléfono para transferencia.
 * Usa RPC SECURITY DEFINER que accede a auth.users.phone.
 */
export async function lookupUserByPhone(phone: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = phoneSchema.safeParse(phone)
  if (!parsed.success) return { error: 'Número de teléfono inválido' }

  const normalizedPhone = normalizePhone(parsed.data)

  const { data, error } = await supabase.rpc('lookup_user_by_phone', {
    p_phone: normalizedPhone,
  })

  if (error) {
    console.error('[transfer] lookupUserByPhone error:', error)
    return { error: 'Error al buscar usuario' }
  }

  if (!data?.found) {
    return { error: data?.error || 'Número no registrado en la plataforma' }
  }

  return {
    user: {
      id: data.user_id,
      username: data.username,
      avatar_url: data.avatar_url,
      level: data.level,
    }
  }
}

/**
 * Ejecuta una transferencia atómica de saldo entre jugadores.
 * Crea dos entradas en el ledger inmutable (debit sender + credit recipient).
 */
export async function transferToPlayer(recipientId: string, amountCents: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = transferSchema.safeParse({ recipientId, amountCents })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Datos inválidos' }
  }

  const { data, error } = await supabase.rpc('transfer_between_players', {
    p_recipient_id: parsed.data.recipientId,
    p_amount_cents: parsed.data.amountCents,
    p_sender_id: user.id,
  })

  if (error) {
    console.error('[transfer] transferToPlayer error:', error)
    return { error: 'Error al procesar la transferencia' }
  }

  if (data?.error) {
    return { error: data.error }
  }

  return {
    success: true,
    referenceId: data.reference_id,
    senderBalanceAfter: data.sender_balance_after,
    recipientName: data.recipient_name,
    amountCents: data.amount_cents,
  }
}
