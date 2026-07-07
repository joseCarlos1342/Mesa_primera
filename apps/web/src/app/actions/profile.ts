'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { nicknameSchema, fullNameSchema } from '@/lib/validations'

export async function updateMyProfile(input: {
  username: string
  full_name: string
}): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const usernameParsed = nicknameSchema.safeParse(input.username?.trim() ?? '')
  if (!usernameParsed.success) {
    return { error: 'Alias inválido. Solo letras, números y guión bajo. 3-20 caracteres.' }
  }

  const fullNameParsed = fullNameSchema.safeParse(input.full_name?.trim() ?? '')
  if (!fullNameParsed.success) {
    return { error: 'Nombre inválido. Solo letras, espacios y guiones. 2-80 caracteres.' }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      username: usernameParsed.data,
      full_name: fullNameParsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('[PROFILE] Error al actualizar perfil de %s: %s', user.id, updateError.message)
    return { error: 'No pudimos actualizar tu perfil. Intenta de nuevo.' }
  }

  revalidatePath('/profile')
  return { success: true }
}