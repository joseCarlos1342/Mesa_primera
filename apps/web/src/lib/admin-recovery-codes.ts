import crypto from 'crypto'

const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const RECOVERY_CODE_GROUP_LENGTH = 4
const RECOVERY_CODE_GROUPS = 3
const RECOVERY_CODE_LENGTH = RECOVERY_CODE_GROUP_LENGTH * RECOVERY_CODE_GROUPS

export const RECOVERY_CODE_COUNT = 8

export function normalizeAdminRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function formatAdminRecoveryCode(value: string) {
  const normalized = normalizeAdminRecoveryCode(value).slice(0, RECOVERY_CODE_LENGTH)
  const groups = normalized.match(new RegExp(`.{1,${RECOVERY_CODE_GROUP_LENGTH}}`, 'g')) ?? []

  return groups.join('-')
}

export function hashAdminRecoveryCode(value: string) {
  return crypto.createHash('sha256').update(normalizeAdminRecoveryCode(value)).digest('hex')
}

function generateRecoveryCodeValue() {
  let normalized = ''

  while (normalized.length < RECOVERY_CODE_LENGTH) {
    const index = crypto.randomInt(0, RECOVERY_CODE_ALPHABET.length)
    normalized += RECOVERY_CODE_ALPHABET[index]
  }

  return formatAdminRecoveryCode(normalized)
}

export function generateAdminRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  const codes = new Set<string>()

  while (codes.size < count) {
    codes.add(generateRecoveryCodeValue())
  }

  return Array.from(codes)
}