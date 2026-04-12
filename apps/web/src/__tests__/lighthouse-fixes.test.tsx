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
