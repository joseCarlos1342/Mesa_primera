import { getGameModalOverlayClassName } from '../modal-overlay'

describe('getGameModalOverlayClassName', () => {
  it('matches the in-game modal blur instead of the overly dark deposit overlay', () => {
    const className = getGameModalOverlayClassName()

    expect(className).toContain('fixed inset-0')
    expect(className).toContain('bg-black/80')
    expect(className).toContain('backdrop-blur-sm')
    expect(className).toContain('supports-backdrop-filter:bg-black/60')
    expect(className).not.toContain('bg-black/95')
  })
})