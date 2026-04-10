/**
 * Normaliza un teléfono colombiano a formato E.164 (+57...).
 *
 * Soporta números reales (3xx) y números legacy de hackatón (0000000002, etc.).
 * Siempre agrega +57 a cualquier input local de 10 dígitos.
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')

  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('57') && cleaned.length >= 12) return `+${cleaned}`
    return `+57${cleaned}`
  }
  return cleaned
}
