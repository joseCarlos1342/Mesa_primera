import fs from 'fs'
import path from 'path'

const read = (relative: string) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf-8')

const PLAYER_PAGES = [
  'login/player/page.tsx',
  'login/player/verify/page.tsx',
  'login/player/device-verify/page.tsx',
  'register/player/page.tsx',
  'register/player/verify/page.tsx',
  'register/player/pin/page.tsx',
  'register/player/biometric/page.tsx',
  'register/player/complete/page.tsx',
  'recovery/page.tsx',
  'recovery/verify/page.tsx',
  'recovery/pin/page.tsx',
]

const ADMIN_PAGES = [
  'login/admin/page.tsx',
  'login/admin/mfa/page.tsx',
  'login/admin/mfa/setup/page.tsx',
  'login/admin/password/page.tsx',
  'login/admin/recovery/page.tsx',
  'register/admin/page.tsx',
]

/** Restos del estilo anterior (tarjeta de cristal, botón 3D con brillo, texto degradado). */
const LEGACY_LOOK = /bg-slate-950|rounded-\[2\.5rem\]|backdrop-blur-2xl|border-b-4|bg-clip-text|font-black|skew-x/

describe('auth layout regressions', () => {
  it.each(PLAYER_PAGES)('%s usa AuthShell de "La baraja abierta" sin el estilo anterior', (page) => {
    const source = read(page)

    expect(source).toMatch(/<AuthShell/)
    expect(source).not.toMatch(LEGACY_LOOK)
    // Mundo player: nada del indigo funcional del admin.
    expect(source).not.toMatch(/indigo-|AdminAuthShell/)
  })

  it.each(ADMIN_PAGES)('%s usa AdminAuthShell sin colores del mundo player', (page) => {
    const source = read(page)

    expect(source).toMatch(/<AdminAuthShell/)
    expect(source).not.toMatch(LEGACY_LOOK)
    expect(source).not.toMatch(/brand-gold|AuthShell title|#0a2c20|#8b6b2e/)
  })

  it('admin login keeps simplified copy', () => {
    const source = read('login/admin/page.tsx')

    expect(source).toMatch(/title="Admin"/)
    expect(source).not.toMatch(/Estación Admin|Autenticación de Bóveda|Acceder al Centro de Mando|Authorized Personnel Only/)
    expect(source).toMatch(/'Acceder'/)
  })

  it('complete profile page allows long Google emails to wrap inside the card', () => {
    const source = read('register/player/complete/page.tsx')

    expect(source).toMatch(/min-w-0/)
    expect(source).toMatch(/break-all|break-words/)
  })

  it('player login keeps the "o" divider without the black capsule background', () => {
    const source = read('login/player/page.tsx')

    expect(source).toMatch(/<AuthDivider \/>/)
    expect(source).not.toMatch(/bg-black\/60/)
  })
})
