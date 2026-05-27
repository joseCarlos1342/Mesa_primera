import crypto from 'crypto'
import {
  RECOVERY_CODE_COUNT,
  formatAdminRecoveryCode,
  generateAdminRecoveryCodes,
  hashAdminRecoveryCode,
  normalizeAdminRecoveryCode,
} from '../admin-recovery-codes'

describe('admin recovery codes', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('normaliza codigos removiendo separadores y simbolos', () => {
    expect(normalizeAdminRecoveryCode(' abcd-1234 xy_z! ')).toBe('ABCD1234XYZ')
  })

  it('formatea codigos normalizados en grupos de cuatro hasta el largo maximo', () => {
    expect(formatAdminRecoveryCode('abcd-1234-wxyz-extra')).toBe('ABCD-1234-WXYZ')
    expect(formatAdminRecoveryCode('abc')).toBe('ABC')
  })

  it('hashea siempre el valor normalizado', () => {
    const expected = crypto.createHash('sha256').update('ABCD1234WXYZ').digest('hex')

    expect(hashAdminRecoveryCode('abcd-1234-wxyz')).toBe(expected)
    expect(hashAdminRecoveryCode('ABCD1234WXYZ')).toBe(expected)
  })

  it('genera la cantidad por defecto de codigos unicos con formato seguro', () => {
    let next = 0
    jest.spyOn(crypto, 'randomInt').mockImplementation(() => next++ % 32)

    const codes = generateAdminRecoveryCodes()

    expect(codes).toHaveLength(RECOVERY_CODE_COUNT)
    expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT)
    expect(codes).toEqual(expect.arrayContaining([expect.stringMatching(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)]))
  })

  it('respeta conteos personalizados', () => {
    let next = 7
    jest.spyOn(crypto, 'randomInt').mockImplementation(() => next++ % 32)

    expect(generateAdminRecoveryCodes(2)).toHaveLength(2)
  })
})
