import { getArcCardLayout } from '../hand-layout'

describe('getArcCardLayout', () => {
  it('returns a neutral centered layout for a single card', () => {
    expect(
      getArcCardLayout({
        index: 0,
        count: 1,
        variant: 'opponent',
        density: 'compact',
      })
    ).toEqual({
      angle: 0,
      offsetX: 0,
      offsetY: 0,
      zIndex: 1,
    })
  })

  it('mirrors the left and right cards symmetrically for opponent hands', () => {
    const left = getArcCardLayout({
      index: 0,
      count: 4,
      variant: 'opponent',
      density: 'compact',
    })
    const right = getArcCardLayout({
      index: 3,
      count: 4,
      variant: 'opponent',
      density: 'compact',
    })

    expect(left.offsetX).toBe(-right.offsetX)
    expect(left.angle).toBe(-right.angle)
    expect(left.offsetY).toBe(right.offsetY)
  })

  it('keeps the center cards visually higher than the edges in a soft arc', () => {
    const edge = getArcCardLayout({
      index: 0,
      count: 4,
      variant: 'self',
      density: 'comfortable',
    })
    const nearCenter = getArcCardLayout({
      index: 1,
      count: 4,
      variant: 'self',
      density: 'comfortable',
    })

    expect(edge.offsetY).toBeGreaterThan(nearCenter.offsetY)
  })

  it('uses a wider spread for the player hand than compact opponent hands', () => {
    const opponent = getArcCardLayout({
      index: 0,
      count: 4,
      variant: 'opponent',
      density: 'compact',
    })
    const mine = getArcCardLayout({
      index: 0,
      count: 4,
      variant: 'self',
      density: 'comfortable',
    })

    expect(Math.abs(mine.offsetX)).toBeGreaterThan(Math.abs(opponent.offsetX))
    expect(Math.abs(mine.angle)).toBeLessThanOrEqual(8)
    expect(Math.abs(opponent.angle)).toBeLessThanOrEqual(6)
  })
})