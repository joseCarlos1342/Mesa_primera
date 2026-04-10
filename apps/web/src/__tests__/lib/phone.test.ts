import { normalizePhone } from '@/lib/phone'

describe('normalizePhone', () => {
  it('adds +57 to real Colombian 10-digit number', () => {
    expect(normalizePhone('3205802918')).toBe('+573205802918')
  })

  it('adds +57 to legacy hackathon number 0000000002', () => {
    expect(normalizePhone('0000000002')).toBe('+570000000002')
  })

  it('adds +57 to legacy hackathon number 0000000003', () => {
    expect(normalizePhone('0000000003')).toBe('+570000000003')
  })

  it('preserves already-formatted E.164 number with +57', () => {
    expect(normalizePhone('+573205802918')).toBe('+573205802918')
  })

  it('adds + to number starting with 57 and 12+ digits', () => {
    expect(normalizePhone('573205802918')).toBe('+573205802918')
  })

  it('adds +57 to number with spaces and dashes', () => {
    expect(normalizePhone('320 580 2918')).toBe('+573205802918')
  })

  it('handles +57 with spaces', () => {
    expect(normalizePhone('+57 320 580 2918')).toBe('+573205802918')
  })

  it('adds +57 to short legacy number 570000000002', () => {
    expect(normalizePhone('570000000002')).toBe('+570000000002')
  })
})
