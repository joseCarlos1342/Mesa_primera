import { describe, expect, it } from 'vitest'
import { validateBetAmount, validateDroppedCards } from '../PlayerActionCommand'

describe('validación de descartes', () => {
  it('acepta únicamente cartas únicas que pertenecen a la mano', () => {
    expect(validateDroppedCards('1-O,2-C,3-E,4-B', ['1-O', '3-E'])).toBe(true)
    expect(validateDroppedCards('1-O,2-C,3-E,4-B', ['9-O'])).toBe(false)
    expect(validateDroppedCards('1-O,2-C,3-E,4-B', ['1-O', '1-O'])).toBe(false)
  })

  it('rechaza importes no enteros, infinitos o no positivos', () => {
    expect(validateBetAmount(500000)).toBe(true)
    expect(validateBetAmount(500000.5)).toBe(false)
    expect(validateBetAmount(Infinity)).toBe(false)
    expect(validateBetAmount(0)).toBe(false)
  })
})
