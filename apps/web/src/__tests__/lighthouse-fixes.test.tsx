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
  it('(auth) layout.tsx exists and wraps children in a <main> element', async () => {
    const { default: AuthLayout } = await import(
      '@/app/(auth)/layout'
    )
    render(<AuthLayout><p>child</p></AuthLayout>)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).toHaveTextContent('child')
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

  it('BiometricSetupPage does not use text-white\/30', () => {
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
      path.resolve(__dirname, '../app/(player)/page.tsx'),
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
  it('TransactionModal close button has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/TransactionModal.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/aria-label/)
  })

  it('TransferModal close button has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/TransferModal.tsx'),
      'utf-8'
    )
    expect(source).toMatch(/aria-label/)
  })

  it('TransferModal back button has aria-label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/wallet/TransferModal.tsx'),
      'utf-8'
    )
    // Must have at least 2 aria-labels (back + close)
    const matches = source.match(/aria-label/g)
    expect(matches?.length).toBeGreaterThanOrEqual(2)
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
    expect(source).toMatch(/getMyStats\(\)/)
    expect(source).toMatch(/getLeaderboard/)
  })

  it('StatsShell renders header instantly without data dependency', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/stats/_components/StatsShell.tsx'),
      'utf-8'
    )
    // Shell should NOT import any data-fetching actions
    expect(source).not.toMatch(/getMyStats|getLeaderboard/)
    // Shell should contain the h1
    expect(source).toMatch(/<h1/)
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

  it('Empty state container does not have opacity-30 on text parent', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/_components/FriendsList.tsx'),
      'utf-8'
    )
    // The main container wrapping text should not have opacity-30
    const emptyStateMatch = source.match(/rounded-\[3rem\][^"]*"/)
    expect(emptyStateMatch?.[0]).not.toMatch(/opacity-30/)
  })

  it('Empty state uses text-slate-400 or lighter for visible text', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/friends/_components/FriendsList.tsx'),
      'utf-8'
    )
    // "Tu círculo está vacío" text must not use text-slate-700+ on dark bg
    expect(source).toMatch(/Tu círculo está vacío/)
    // Ensure the line uses a visible color (slate-400 or brighter)
    const lines = source.split('\n')
    const circuloLine = lines.find(l => l.includes('Tu círculo está vacío'))
    expect(circuloLine).toMatch(/text-slate-[1-4]00/)
  })
})

// ────────────────────────────────────────────────
// 19. Rules page — heading order
// ────────────────────────────────────────────────
describe('Rules page heading order', () => {
  it('does not use h3 elements (sections should be h2)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/rules/page.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/<h3[\s>]/)
  })

  it('does not use h4 elements (support section should be h2)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/rules/page.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/<h4[\s>]/)
  })
})

// ────────────────────────────────────────────────
// 20. Rules page — contrast compliance
// ────────────────────────────────────────────────
describe('Rules page contrast compliance', () => {
  it('Footer does not use opacity-30 wrapper', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/rules/page.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/className="[^"]*opacity-30[^"]*">\s*<p/)
  })

  it('Support section does not use opacity-50 on text', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/rules/page.tsx'),
      'utf-8'
    )
    expect(source).not.toMatch(/opacity-50[\s\S]{0,20}">/)
  })

  it('Footer uses text-slate-500 or visible color instead of dimmed white', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(player)/rules/page.tsx'),
      'utf-8'
    )
    const lines = source.split('\n')
    const footerPIdx = lines.findIndex(l => l.includes('Estatutos Oficiales'))
    // The class is on the <p> tag which is the previous line
    const contextLines = lines.slice(Math.max(0, footerPIdx - 2), footerPIdx + 1).join('\n')
    expect(contextLines).toMatch(/text-slate-[1-5]00/)
  })
})

// ── Profile page fixes ─────────────────────────────────────────────

const profileSource = fs.readFileSync(
  path.resolve(__dirname, '../app/(player)/profile/page.tsx'),
  'utf-8'
)

describe('Profile page button-name compliance', () => {
  it('Avatar upload button has aria-label', () => {
    // aria-label on the button, Camera icon inside
    const avatarBtnIdx = profileSource.indexOf('<Camera className="w-6 h-6 md:w-7')
    const btnContext = profileSource.substring(avatarBtnIdx - 500, avatarBtnIdx)
    expect(btnContext).toContain('aria-label=')
  })

  it('Biometric toggle button has aria-label', () => {
    expect(profileSource).toMatch(/aria-label="[^"]+"\s*\n\s*onClick={async \(\) => {\s*\n\s*if \(lockEnabled\)/)
  })
})

describe('Profile page heading order', () => {
  it('Username heading uses h2 instead of h3', () => {
    expect(profileSource).toMatch(/<h2[^>]*>[\s\S]*?{formData\.username/)
    expect(profileSource).not.toMatch(/<h3[^>]*>[\s\S]*?{formData\.username/)
  })
})

describe('Profile page contrast compliance', () => {
  it('Stat labels use text-slate-400 instead of text-slate-600', () => {
    const mesasMatch = profileSource.match(/Mesas<\/p>[\s\S]{0,5}/)
    const mesasContext = profileSource.substring(
      profileSource.indexOf('Mesas</p>') - 80,
      profileSource.indexOf('Mesas</p>')
    )
    expect(mesasContext).toContain('text-slate-400')
    expect(mesasContext).not.toContain('text-slate-600')
  })

  it('Form labels use text-brand-gold without opacity modifier', () => {
    const aliasLabel = profileSource.match(/Alias de Jugador[\s\S]{0,5}/)
    const aliasContext = profileSource.substring(
      profileSource.indexOf('Alias de Jugador') - 100,
      profileSource.indexOf('Alias de Jugador')
    )
    expect(aliasContext).not.toMatch(/text-brand-gold\/\d+/)
  })

  it('Email section does not use container-level opacity-40', () => {
    const emailIdx = profileSource.indexOf('Enlace de Bóveda')
    const emailContainer = profileSource.substring(emailIdx - 120, emailIdx)
    expect(emailContainer).not.toContain('opacity-40')
  })

  it('Email input has aria-label for accessibility', () => {
    expect(profileSource).toMatch(/type="email"\s*\n\s*aria-label="[^"]+"/)
  })

  it('Biometric description uses text-slate-400 instead of text-white/40', () => {
    const bioIdx = profileSource.indexOf('Pide verificación al abrir la app')
    const bioContext = profileSource.substring(bioIdx - 80, bioIdx)
    expect(bioContext).toContain('text-slate-400')
    expect(bioContext).not.toContain('text-white/40')
  })
})

// ── Lobby page fixes ────────────────────────────────────────────────

describe('Lobby page contrast compliance', () => {
  const lobbySource = fs.readFileSync(
    path.resolve(__dirname, '../components/game/Lobby.tsx'),
    'utf-8'
  )

  it('Bottom info section does not use container-level opacity', () => {
    const infoIdx = lobbySource.indexOf('Seguridad de Élite')
    const container = lobbySource.substring(infoIdx - 200, infoIdx)
    expect(container).not.toMatch(/opacity-\d+/)
  })

  it('Bottom info labels use text-slate-400 instead of text-slate-500', () => {
    const infoIdx = lobbySource.indexOf('Seguridad de Élite')
    const context = lobbySource.substring(infoIdx - 120, infoIdx)
    expect(context).toContain('text-slate-400')
    expect(context).not.toContain('text-slate-500')
  })
})
