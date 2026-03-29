import { z } from 'zod'

// ─── Mensajes reutilizables ───────────────────────────────────────────────────

const MESSAGES = {
  required: 'Este campo es obligatorio',
  phone: 'Número inválido — ingresa 10 dígitos comenzando por 3 (ejemplo: 3001234567)',
  fullName: 'Solo letras, espacios y guiones. Entre 2 y 80 caracteres',
  nickname: 'Solo letras, números y guión bajo _. Entre 3 y 20 caracteres, sin espacios',
  otp: 'El código debe tener exactamente 6 dígitos',
  email: 'Correo electrónico inválido',
  passwordMin: 'La contraseña debe tener al menos 8 caracteres',
  passwordMax: 'La contraseña no puede superar 100 caracteres',
  amountMin: 'El monto mínimo es $10.000 COP',
  amountMax: 'El monto máximo es $50.000.000 COP',
  amountInt: 'El monto debe ser un número entero positivo',
  fileType: 'Solo se aceptan imágenes (JPG, PNG, WebP, GIF)',
  fileSize: 'El archivo no puede superar 5 MB',
  observationsMax: 'Máximo 500 caracteres',
  reasonMin: 'La razón debe tener al menos 10 caracteres',
  reasonMax: 'La razón no puede superar 500 caracteres',
}

// ─── Schemas individuales ─────────────────────────────────────────────────────

/**
 * Teléfono colombiano: 10 dígitos comenzando por 3 (sin +57).
 * El servidor agrega el +57 internamente.
 */
export const phoneSchema = z
  .string({ error: MESSAGES.phone })
  .trim()
  .regex(/^[0-9]{10}$/, MESSAGES.phone)

/**
 * Nombre real: letras con o sin tilde, espacios, guiones, puntos.
 * Entre 2 y 80 caracteres.
 */
export const fullNameSchema = z
  .string({ error: MESSAGES.fullName })
  .trim()
  .min(2, MESSAGES.fullName)
  .max(80, MESSAGES.fullName)
  .regex(
    /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\-.]{0,79}$/u,
    MESSAGES.fullName
  )

/**
 * Apodo/nickname: solo letras ASCII, números y guión bajo. Sin espacios.
 * Entre 3 y 20 caracteres.
 */
export const nicknameSchema = z
  .string({ error: MESSAGES.nickname })
  .trim()
  .min(3, MESSAGES.nickname)
  .max(20, MESSAGES.nickname)
  .regex(/^[a-zA-Z0-9_]{3,20}$/, MESSAGES.nickname)

/**
 * Código OTP: exactamente 6 dígitos numéricos.
 */
export const otpTokenSchema = z
  .string({ error: MESSAGES.otp })
  .trim()
  .regex(/^\d{6}$/, MESSAGES.otp)

/**
 * Email de administrador.
 */
export const adminEmailSchema = z
  .string({ error: MESSAGES.email })
  .trim()
  .email(MESSAGES.email)
  .max(254, 'El correo es demasiado largo')

/**
 * Contraseña de administrador.
 */
export const adminPasswordSchema = z
  .string({ error: MESSAGES.passwordMin })
  .min(8, MESSAGES.passwordMin)
  .max(100, MESSAGES.passwordMax)

/**
 * Monto de depósito en COP (sin centavos).
 * Mínimo $10.000 — Máximo $50.000.000.
 */
export const depositAmountSchema = z
  .number({ error: MESSAGES.amountInt })
  .int(MESSAGES.amountInt)
  .min(10_000, MESSAGES.amountMin)
  .max(50_000_000, MESSAGES.amountMax)

/**
 * Observaciones opcionales de depósito.
 */
export const observationsSchema = z
  .string()
  .max(500, MESSAGES.observationsMax)
  .optional()
  .transform(v => v?.trim() ?? '')

/**
 * Razón para ajuste de saldo (admin).
 */
export const balanceReasonSchema = z
  .string({ error: MESSAGES.reasonMin })
  .trim()
  .min(10, MESSAGES.reasonMin)
  .max(500, MESSAGES.reasonMax)

// ─── Schemas compuestos ───────────────────────────────────────────────────────

export const registerPlayerSchema = z.object({
  phone: phoneSchema,
  fullName: fullNameSchema,
  nickname: nicknameSchema,
})

export const loginPlayerSchema = z.object({
  phone: phoneSchema,
})

export const loginAdminSchema = z.object({
  email: adminEmailSchema,
  password: adminPasswordSchema,
})

export const depositSchema = z.object({
  amount: depositAmountSchema,
  observations: observationsSchema,
})

// ─── Tipos inferidos ──────────────────────────────────────────────────────────

export type RegisterPlayerInput = z.infer<typeof registerPlayerSchema>
export type LoginPlayerInput = z.infer<typeof loginPlayerSchema>
export type LoginAdminInput = z.infer<typeof loginAdminSchema>
export type DepositInput = z.infer<typeof depositSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte errores Zod en un objeto plano `{ campo: "mensaje" }`.
 * Usa el primer error de cada campo para mantener los mensajes cortos.
 * Compatible con Zod v4 (.issues) y v3 (.errors).
 */
export function flattenZodErrors(
  zodError: z.ZodError
): Record<string, string> {
  const result: Record<string, string> = {}
  const issues = (zodError as any).issues ?? (zodError as any).errors ?? []
  for (const issue of issues) {
    const field = issue.path.join('.')
    if (!result[field]) {
      result[field] = issue.message
    }
  }
  return result
}

/**
 * Valida un archivo de imagen en el cliente.
 * Retorna un string con el error, o null si es válido.
 */
export function validateImageFile(file: File): string | null {
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return MESSAGES.fileType
  }
  if (file.size > MAX_SIZE_BYTES) {
    return MESSAGES.fileSize
  }
  return null
}
