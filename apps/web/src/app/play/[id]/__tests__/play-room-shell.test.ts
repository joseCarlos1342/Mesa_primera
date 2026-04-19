import { getPlayRoomShellClassName } from '../play-room-shell'

describe('getPlayRoomShellClassName', () => {
  it('uses a uniform green shell in lobby without the dark vignette overlay', () => {
    const className = getPlayRoomShellClassName('LOBBY')

    expect(className).toContain('bg-[#073926]')
    expect(className).toContain('min-h-screen')
    expect(className).not.toContain('before:content-')
    expect(className).not.toContain('before:via-[rgba(0,0,0,0.1)]')
    expect(className).not.toContain('before:to-[rgba(0,0,0,0.5)]')
  })

  it('keeps the vignette shell for active gameplay phases', () => {
    const className = getPlayRoomShellClassName('GUERRA')

    expect(className).toContain('h-screen')
    expect(className).toContain('overflow-hidden')
    expect(className).toContain("before:content-['']")
    expect(className).toContain('before:via-[rgba(0,0,0,0.1)]')
    expect(className).toContain('before:to-[rgba(0,0,0,0.5)]')
  })
})