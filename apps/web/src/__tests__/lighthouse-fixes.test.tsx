/**
 * RED phase — Tests for Lighthouse audit corrections.
 * These must FAIL before implementing fixes.
 *
 * Covers:
 * - Viewport allows user zoom (P0 accessibility)
 * - Auth pages wrapped in <main> landmark
 * - Contrast: no low-contrast utility classes on dark backgrounds
 * - MFA setup: stable height reservation to avoid CLS
 * - Biometric: has its own canonical metadata
 */
import { viewport } from '@/app/layout'
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

// ────────────────────────────────────────────────
// 1. Viewport — must allow zoom
// ────────────────────────────────────────────────
describe('Root layout viewport', () => {
  it('does not set maximumScale to 1', () => {
    // maximumScale=1 blocks pinch-to-zoom on mobile, failing WCAG 1.4.4
    expect(viewport.maximumScale).not.toBe(1)
  })

  it('does not disable userScalable', () => {
    // userScalable=false is an accessibility violation
    expect(viewport.userScalable).not.toBe(false)
  })
})

// ────────────────────────────────────────────────
// 2. Auth pages — semantic landmark <main>
// ────────────────────────────────────────────────
describe('Auth pages have <main> landmark', () => {
  it('both auth shells wrap the form in a single <main>, with the nav outside it', async () => {
    const { AuthShell } = await import('@/components/auth/AuthShell')
    const { AdminAuthShell } = await import('@/components/auth/AdminAuthShell')
    const { ShieldCheck } = await import('lucide-react')

    const { unmount } = render(<AuthShell title="Login"><p>child</p></AuthShell>)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveTextContent('child')
    expect(screen.getByRole('main')).not.toContainElement(screen.getByRole('navigation'))
    unmount()

    render(<AdminAuthShell icon={ShieldCheck} title="Admin"><p>admin-child</p></AdminAuthShell>)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveTextContent('admin-child')
  })

  it('(auth) layout does not add a second <main> around the shells', async () => {
    const { default: AuthLayout } = await import('@/app/(auth)/layout')
    render(<AuthLayout><p>child</p></AuthLayout>)
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
    expect(screen.getByText('child')).toBeInTheDocument()
  })
})

// ────────────────────────────────────────────────
// 3. Contrast — no low-contrast classes on dark bg
// ────────────────────────────────────────────────
describe('Auth pages contrast compliance', () => {
  it('AdminMFAPage does not use text-slate-500 or text-slate-600', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../app/(auth)/login/admin/mfa/page.tsx'
      ),
      'utf-8'
    )
    expect(source).not.toMatch(/text-slate-500/)
    expect(source).not.toMatch(/text-slate-600/)
  })

  it('AdminMFASetupPage does not use text-slate-500 or text-slate-600', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../app/(auth)/login/admin/mfa/setup/page.tsx'
      ),
      'utf-8'
    )
    expect(source).not.toMatch(/text-slate-500/)
    expect(source).not.toMatch(/text-slate-600/)
  })

  it('AdminRegisterPage does not use text-slate-500 on labels', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../app/(auth)/register/admin/page.tsx'
      ),
      'utf-8'
    )
    expect(source).not.toMatch(/text-slate-500/)
  })

  it('BiometricSetupPage does not use text-white/30', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../app/(auth)/register/player/biometric/page.tsx'
      ),
      'utf-8'
    )
    expect(source).not.toMatch(/text-white\/30/)
  })
})

// ────────────────────────────────────────────────
// 4. MFA setup — stable layout height
// ────────────────────────────────────────────────
describe('MFA setup CLS prevention', () => {
  it('reserves a min-height on the content container to avoid layout shift', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../app/(auth)/login/admin/mfa/setup/page.tsx'
      ),
      'utf-8'
    )
    // The enrolling spinner and the QR+form should share a stable height container
    expect(source).toMatch(/min-h-\[/)
  })
})

// ────────────────────────────────────────────────
// 5. Biometric page — has its own canonical
// ────────────────────────────────────────────────
describe('Biometric page metadata', () => {
  it('exports a layout or page-level metadata with canonical for /register/player/biometric', () => {
    const layoutPath = path.resolve(
      __dirname,
      '../app/(auth)/register/player/biometric/layout.tsx'
    )
    const pagePath = path.resolve(
      __dirname,
      '../app/(auth)/register/player/biometric/page.tsx'
    )

    let hasCanonical = false

    // Check layout first
    if (fs.existsSync(layoutPath)) {
      const layoutSource = fs.readFileSync(layoutPath, 'utf-8')
      if (layoutSource.includes('/register/player/biometric')) {
        hasCanonical = true
      }
    }

    // Check page export
    if (!hasCanonical) {
      const pageSource = fs.readFileSync(pagePath, 'utf-8')
      if (pageSource.includes('canonical') && pageSource.includes('/register/player/biometric')) {
        hasCanonical = true
      }
    }

    expect(hasCanonical).toBe(true)
  })
})

// ────────────────────────────────────────────────
// 6. Homepage — button accessible names
// ────────────────────────────────────────────────
describe('Homepage button accessibility', () => {
  it('SupportTrigger has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/SupportTrigger.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/aria-label/)
  })

  it('NotificationCenter button has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/NotificationCenter.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/aria-label/)
  })

  it('SignOutButton has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/auth/sign-out-button.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/aria-label/)
  })
})

// ────────────────────────────────────────────────
// 7. Homepage — color contrast compliance
// ────────────────────────────────────────────────
describe('Homepage contrast compliance', () => {
  it('PlayerDashboard transaction date text does not use opacity-60', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/dashboard/PlayerDashboard.tsx'),
      'utf-8'
    )
    // text-[9px] with opacity-60 fails WCAG contrast on dark bg
    expect(source).not.toMatch(/text-\[9px\].*opacity-60/)
  })

  it('PlayerDashboard "Saldo Disponible" label does not use opacity-60', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/dashboard/PlayerDashboard.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/Saldo Disponible.*opacity-60/)
  })
})

// ────────────────────────────────────────────────
// 8. Homepage — LCP optimization: server-side data
// ────────────────────────────────────────────────
describe('Homepage LCP optimization', () => {
  it('PlayerPage fetches wallet data server-side and passes initialData', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/dashboard/page.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/async/)
    expect(source).toMatch(/getWalletData/)
    expect(source).toMatch(/initialData/)
  })

  it('PlayerDashboard accepts initialData prop', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/dashboard/PlayerDashboard.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/initialData/)
  })
})

// ────────────────────────────────────────────────
// 9. Wallet page — color contrast compliance
// ────────────────────────────────────────────────
describe('Wallet page contrast compliance', () => {
  it('WalletContent does not use text-[8px] + opacity-60 in chip packs', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/WalletContent.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/text-\[8px\].*opacity-60/)
  })

  it('WalletContent transaction date does not use text-[9px] + opacity-60', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/WalletContent.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/text-\[9px\].*opacity-60/)
  })

  it('WalletContent "Saldo en Cartera" does not use opacity-60', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/WalletContent.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/Saldo en Cartera[\s\S]{0,100}opacity-60/)
  })

  it('TransactionModal DetailItem labels do not use text-[8px] + opacity-60', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/TransactionModal.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/text-\[8px\].*opacity-60/)
  })
})

// ────────────────────────────────────────────────
// 10. Wallet page — button accessible names
// ────────────────────────────────────────────────
describe('Wallet page button accessibility', () => {
  it('TransactionModal provee un cierre accesible vía PlayerSheet (closeLabel)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/TransactionModal.tsx'),
      'utf-8'
    )
    // El cierre accesible ahora lo aporta PlayerSheet a través de closeLabel
    expect(source).toMatch(/PlayerSheet/)
    expect(source).toMatch(/closeLabel=/)
  })

  it('TransferModal provee un cierre accesible vía PlayerSheet (closeLabel)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/TransferModal.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/PlayerSheet/)
    expect(source).toMatch(/closeLabel=/)
  })

  it('TransferModal back button has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/TransferModal.tsx'),
      'utf-8'
    )
    // El botón de volver (headerStart) expone aria-label; el cierre lo da closeLabel
    expect(source).toMatch(/aria-label/)
    expect(source).toMatch(/closeLabel=/)
  })
})

// ────────────────────────────────────────────────
// 11. Wallet page — LCP optimization: no external URL textures
// ────────────────────────────────────────────────
describe('Wallet page LCP optimization', () => {
  it('WalletContent does not reference external texture URLs', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/WalletContent.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/transparenttextures\.com/)
  })
})

// ────────────────────────────────────────────────
// 12. Stats page — Server-side data fetching (LCP)
// ────────────────────────────────────────────────
describe('Stats page server-side rendering', () => {
  it('page.tsx is a server component (no "use client")', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/page.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/['"]use client['"]/)
  })

  it('page.tsx uses Suspense for streaming', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/page.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/Suspense/)
    expect(source).toMatch(/fallback/)
  })

  it('page.tsx calls getMyStats and getLeaderboard server-side', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/page.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/<StatsData\s*\/>/)
    expect(source).toMatch(/<Suspense/)
  })

  it('StatsShell renders header instantly without data dependency', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/StatsShell.tsx'),
      'utf-8'
    )
    // Shell should NOT import any data-fetching actions
    expect(source).not.toMatch(/getMyStats|getLeaderboard/)
    // El encabezado lo aporta PageHeader (que renderiza el h1 en PlayerUI.tsx)
    expect(source).toMatch(/PageHeader/)
    const playerUi = fs.readFileSync(
      path.resolve(__dirname, '../components/player/PlayerUI.tsx'),
      'utf-8'
    )
    expect(playerUi).toMatch(/<h1/)
  })
})

// ────────────────────────────────────────────────
// 13. Stats page — no external texture URLs (LCP)
// ────────────────────────────────────────────────
describe('Stats page LCP optimization', () => {
  it('stats-dashboard does not reference external texture URLs', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/stats-dashboard.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/transparenttextures\.com/)
  })
})

// ────────────────────────────────────────────────
// 14. Stats page — framer-motion uses m (tree-shakable)
// ────────────────────────────────────────────────
describe('Stats page framer-motion tree-shaking', () => {
  const statsFiles = [
    '../app/(player)/stats/_components/stats-dashboard.tsx',
    '../app/(player)/stats/_components/StatsTabs.tsx',
    '../app/(player)/stats/_components/Leaderboard.tsx',
    '../app/(player)/stats/_components/StatsClient.tsx',
    '../app/(player)/stats/_components/StatsShell.tsx',
  ]

  statsFiles.forEach((file) => {
    const name = file.split('/').pop()
    it(`${name} does not import "motion" (uses "m" instead)`, () => {
      const source = fs.readFileSync(path.resolve(__dirname, file), 'utf-8')
      // Should not have: import { motion } or import { motion,
      expect(source).not.toMatch(/import\s+\{[^}]*\bmotion\b/)
    })
  })
})

// ────────────────────────────────────────────────
// 15. Stats page — contrast compliance (no opacity on text)
// ────────────────────────────────────────────────
describe('Stats page contrast compliance', () => {
  it('stats-dashboard has no opacity-60 on text-text-secondary', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/stats-dashboard.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/text-text-secondary[\s\S]{0,40}opacity-60/)
    expect(source).not.toMatch(/opacity-60[\s\S]{0,40}text-text-secondary/)
  })

  it('stats-dashboard has no opacity-40 on text-text-secondary', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/stats-dashboard.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/text-text-secondary[\s\S]{0,40}opacity-40/)
    expect(source).not.toMatch(/opacity-40[\s\S]{0,40}text-text-secondary/)
  })

  it('Leaderboard has no opacity-60 on text-text-secondary wrappers', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/Leaderboard.tsx'),
      'utf-8'
    )
    // no container div with opacity-60 wrapping text
    expect(source).not.toMatch(/className="[^"]*opacity-60[^"]*">\s*<.*text-text-secondary/)
  })

  it('Leaderboard has no text-[8px] (minimum 10px)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/Leaderboard.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/text-\[8px\]/)
  })
})

// ────────────────────────────────────────────────
// 16. Stats page — heading order compliance
// ────────────────────────────────────────────────
describe('Stats page heading order', () => {
  it('stats-dashboard does not use h4 elements (no heading skip)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/stats-dashboard.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/<h4[\s>]/)
  })

  it('stats-dashboard does not use h3 (should be h2 after h1)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/stats-dashboard.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/<h3[\s>]/)
  })
})

// ────────────────────────────────────────────────
// 17. Friends page — button accessible name
// ────────────────────────────────────────────────
describe('Friends page button accessibility', () => {
  it('Add friend button has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/page.tsx'),
      'utf-8'
    )
    // The UserPlus button must have an aria-label
    expect(source).toMatch(/aria-label=["']Agregar amigo["']/)
  })

  it('Delete modal close button has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/page.tsx'),
      'utf-8'
    )
    // El modal de borrado usa PlayerSheet, cuyo cierre accesible viene de closeLabel="Cerrar"
    expect(source).toMatch(/PlayerSheet/)
    expect(source).toMatch(/closeLabel=["']Cerrar["']/)
  })
})

// ────────────────────────────────────────────────
// 18. Friends page — contrast compliance
// ────────────────────────────────────────────────
describe('Friends page contrast compliance', () => {
  it('Subtitle does not use opacity-60 with text-text-secondary', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/page.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/text-text-secondary[\s\S]{0,40}opacity-60/)
    expect(source).not.toMatch(/opacity-60[\s\S]{0,40}text-text-secondary/)
  })

  it('Footer does not use opacity-20 wrapper with text elements', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/page.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/className="[^"]*opacity-20[^"]*">\s*<p/)
  })

  it('Empty state container does not dim text with opacity', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/_components/FriendsList.tsx'),
      'utf-8'
    )
    // El estado vacío no debe atenuar el texto con opacidades bajas
    expect(source).not.toMatch(/\bopacity-30\b/)
    expect(source).not.toMatch(/\bopacity-20\b/)
  })

  it('Empty state usa un color visible para el texto secundario', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/_components/FriendsList.tsx'),
      'utf-8'
    )
    // El estado vacío ahora dice "Aún no tienes amigos"
    expect(source).toMatch(/Aún no tienes amigos/)
    // Y usa el token de texto secundario de alto contraste del tema player
    expect(source).toMatch(/text-\[#bdb7a6\]/)
  })
})

// ────────────────────────────────────────────────
// 19-20. Rules page — contraste
// El orden de encabezados se verifica renderizando la página en
// src/components/rules/__tests__/RulesContent.test.tsx ("no salta niveles").
// ────────────────────────────────────────────────
describe('Rules page contrast compliance', () => {
  const rulesSources = ['RulesContent.tsx', 'HandTimeline.tsx', 'RulebookAccordion.tsx'].map((file) =>
    fs.readFileSync(path.resolve(__dirname, '../components/rules', file), 'utf-8'),
  )

  it('no atenúa el texto con opacidad', () => {
    for (const source of rulesSources) {
      expect(source).not.toMatch(/\bopacity-(?:[1-6]0)\b/)
      expect(source).not.toMatch(/text-(?:white|\[#f3edd7\]|text-premium)\/[1-6]\d\b/)
    }
  })

  it('la página no sigue dentro del layout legal (tarjeta angosta)', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../app/(legal)/rules/page.tsx'))).toBe(false)
    expect(fs.existsSync(path.resolve(__dirname, '../app/rules/page.tsx'))).toBe(true)
  })
})

// ── Profile page fixes ─────────────────────────────────────────────
// Tras el rediseño, el perfil se compone con ProfileSections (identidad,
// stats, bloqueo biométrico) y AuthField para el formulario. Las aserciones
// verifican el equivalente actual en esos componentes.

const profileSource = fs.readFileSync(
  path.resolve(__dirname, '../app/(player)/profile/page.tsx'),
  'utf-8'
)
const profileSectionsSource = fs.readFileSync(
  path.resolve(__dirname, '../app/(player)/profile/_components/ProfileSections.tsx'),
  'utf-8'
)

describe('Profile page button-name compliance', () => {
  it('Avatar upload button has aria-label', () => {
    // El botón del avatar vive en ProfileIdentity con aria-label "Cambiar avatar"
    expect(profileSectionsSource).toMatch(/aria-label="Cambiar avatar"/)
  })

  it('Biometric toggle button has aria-label', () => {
    // El interruptor biométrico usa role="switch" con aria-label
    expect(profileSectionsSource).toMatch(/role="switch"/)
    expect(profileSectionsSource).toMatch(/aria-label="[^"]+"/)
  })
})

describe('Profile page heading order', () => {
  it('Username heading uses h1 in ProfileIdentity', () => {
    // El nombre del jugador se muestra en un h1 (ProfileIdentity)
    expect(profileSectionsSource).toMatch(/<h1[^>]*>[\s\S]*?\{username/)
    expect(profileSectionsSource).not.toMatch(/<h3[^>]*>[\s\S]*?\{username/)
  })
})

describe('Profile page contrast compliance', () => {
  it('Stat labels use the player secondary token instead of text-slate-600', () => {
    const mesasContext = profileSectionsSource.substring(
      profileSectionsSource.indexOf('StatCell') ,
    )
    // Las etiquetas de StatCell usan el token secundario de alto contraste
    expect(profileSectionsSource).toMatch(/<dt className="text-base text-\[#bdb7a6\]"/)
    expect(mesasContext).not.toContain('text-slate-600')
  })

  it('Form labels (AuthField) no usan modificador de opacidad', () => {
    // El formulario usa AuthField con labels explícitas; sin dorado atenuado
    expect(profileSource).toMatch(/label="Alias de jugador"/)
    expect(profileSource).not.toMatch(/text-brand-gold\/\d+/)
  })

  it('Email field no usa opacidad a nivel de contenedor', () => {
    // El correo se renderiza con AuthField (label "Correo") sin atenuar
    expect(profileSource).toMatch(/label="Correo"/)
    expect(profileSource).not.toMatch(/opacity-40/)
  })

  it('Email field es accesible por su label asociada (AuthField)', () => {
    // AuthField asocia label e input; no hace falta un aria-label suelto
    expect(profileSource).toMatch(/label="Correo"[\s\S]{0,80}type="email"/)
  })

  it('Biometric description usa el token secundario en vez de text-white/40', () => {
    expect(profileSectionsSource).toMatch(/text-\[#bdb7a6\]/)
    expect(profileSectionsSource).not.toContain('text-white/40')
  })
})

// ── Lobby page fixes ────────────────────────────────────────────────

// Tras el rediseño, el lobby abandonó el pie "Seguridad de Élite" y los tokens
// `text-slate-*`. El equivalente vigente es que el componente no use tokens de
// bajo contraste ni atenúe texto con opacidades a nivel de contenedor.
describe('Lobby page contrast compliance', () => {
  const lobbySource = fs.readFileSync(
    path.resolve(__dirname, '../components/game/Lobby.tsx'),
    'utf-8'
  )

  it('no usa los tokens de bajo contraste text-slate-500/600', () => {
    expect(lobbySource).not.toMatch(/text-slate-500/)
    expect(lobbySource).not.toMatch(/text-slate-600/)
  })

  it('no atenúa texto con modificadores de opacidad de bajo contraste', () => {
    // Se permite disabled:opacity-60 en botones (estado deshabilitado), pero no
    // atenuar texto legible con opacity-* sueltas.
    expect(lobbySource).not.toMatch(/(?<!disabled:)\bopacity-(?:[1-5]0)\b/)
    expect(lobbySource).not.toMatch(/text-(?:white|text-premium)\/[1-5]\d\b/)
  })
})

// ── Replay viewer fixes ─────────────────────────────────────────────
// Nota: el reproductor textual fue retirado en favor de la reconstrucci\u00f3n
// visual basada en frames v2 (`<ReplayController>` + `<ReplayBoard>`).
// Los chequeos de heading order y contraste de aquel viewer ya no aplican.

// ────────────────────────────────────────────────
// 20. Wallet modals — ahora usan PlayerSheet (overlay, z-index y safe-area)
// ────────────────────────────────────────────────
describe('PlayerSheet overlay invariants (compartido por TransactionModal/TransferModal)', () => {
  const sheetPath = path.resolve(__dirname, '../components/player/PlayerSheet.tsx')
  let sheetSource: string
  beforeAll(() => { sheetSource = fs.readFileSync(sheetPath, 'utf-8') })

  it('se apila sobre BottomNav (z-[100]) usando z-[300]', () => {
    // BottomNav usa z-[100]; PlayerSheet debe quedar por encima
    const containerMatch = sheetSource.match(/fixed inset-0 z-\[(\d+)\]/)
    expect(containerMatch).not.toBeNull()
    expect(Number(containerMatch![1])).toBeGreaterThan(100)
    expect(sheetSource).toMatch(/z-\[300\]/)
  })

  it('respeta la safe-area inferior con env(safe-area-inset-bottom)', () => {
    expect(sheetSource).toMatch(/env\(safe-area-inset-bottom\)/)
  })

  it('expone un cierre accesible configurable (closeLabel → aria-label)', () => {
    expect(sheetSource).toMatch(/closeLabel/)
    expect(sheetSource).toMatch(/aria-label=\{closeLabel\}/)
  })
})

describe('TransactionModal mobile overlay & content visibility', () => {
  const txModalPath = path.resolve(__dirname, '../components/wallet/TransactionModal.tsx')
  let txSource: string
  beforeAll(() => { txSource = fs.readFileSync(txModalPath, 'utf-8') })

  it('delega el overlay en PlayerSheet en lugar de un contenedor propio', () => {
    expect(txSource).toMatch(/PlayerSheet/)
    expect(txSource).not.toMatch(/fixed inset-0 z-\[\d+\]/)
  })

  it('does not use max-h-[90vh] without safe-area consideration', () => {
    // 90vh ignora el bottom nav y la safe-area en móvil
    expect(txSource).not.toMatch(/max-h-\[90vh\]/)
  })

  it('does not truncate the transaction ID with slice', () => {
    // El UUID completo debe mostrarse, no abreviarse con slice + "..."
    expect(txSource).not.toMatch(/\.slice\(.*\)\s*\+\s*['"]\.\.\.['"]/)
  })
})

describe('TransferModal mobile overlay', () => {
  const transferModalPath = path.resolve(__dirname, '../components/wallet/TransferModal.tsx')
  let transferSource: string
  beforeAll(() => { transferSource = fs.readFileSync(transferModalPath, 'utf-8') })

  it('delega el overlay en PlayerSheet en lugar de un contenedor propio', () => {
    expect(transferSource).toMatch(/PlayerSheet/)
    expect(transferSource).not.toMatch(/fixed inset-0 z-\[\d+\]/)
  })

  it('does not use max-h-[90vh] without safe-area consideration', () => {
    expect(transferSource).not.toMatch(/max-h-\[90vh\]/)
  })
})
