/**
 * RED phase — Tests for public landing + SEO route changes.
 * Covers:
 * - Middleware whitelists `/`, `/privacy`, `/terms` as public
 * - Middleware redirects authenticated players from `/` to `/dashboard`
 * - Player dashboard exists at `/dashboard`
 * - Landing page has required CTAs and footer links
 * - Sitemap only contains public indexable URLs
 * - Legacy SEO page redirects to `/`
 */
import fs from 'fs'
import path from 'path'

// ────────────────────────────────────────────────
// 1. Middleware — public route whitelist
// ────────────────────────────────────────────────
describe('Middleware public route whitelist', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../utils/supabase/middleware.ts'),
    'utf-8',
  )

  it('declares isPublicPage including root, privacy, and terms', () => {
    expect(source).toContain("pathname === '/'")
    expect(source).toContain("'/privacy'")
    expect(source).toContain("'/terms'")
  })

  it('allows unauthenticated access to public pages', () => {
    // The unauthenticated check must include isPublicPage
    expect(source).toContain('isPublicPage')
  })

  it('redirects authenticated players from root to /dashboard', () => {
    expect(source).toContain("'/dashboard'")
  })
})

// ────────────────────────────────────────────────
// 2. Player dashboard at /dashboard
// ────────────────────────────────────────────────
describe('Player dashboard route', () => {
  it('exists at (player)/dashboard/page.tsx', () => {
    const dashboardPath = path.resolve(
      __dirname,
      '../app/(player)/dashboard/page.tsx',
    )
    expect(fs.existsSync(dashboardPath)).toBe(true)
  })

  it('no longer exists at (player)/page.tsx root', () => {
    const oldPath = path.resolve(__dirname, '../app/(player)/page.tsx')
    expect(fs.existsSync(oldPath)).toBe(false)
  })
})

// ────────────────────────────────────────────────
// 3. Public landing page
// ────────────────────────────────────────────────
describe('Public landing page', () => {
  const landingContentPath = path.resolve(
    __dirname,
    '../components/landing/LandingContent.tsx',
  )

  it('exists at app/page.tsx (root level)', () => {
    const landingPath = path.resolve(__dirname, '../app/page.tsx')
    expect(fs.existsSync(landingPath)).toBe(true)
  })

  it('contains registration and login CTAs', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain('/register/player')
    expect(source).toContain('/login/player')
  })

  it('contains footer with privacy and terms links', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain('/privacy')
    expect(source).toContain('/terms')
  })

  it('contains social media links', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain('facebook')
    expect(source).toContain('instagram')
  })
})

// ────────────────────────────────────────────────
// 4. Sitemap — only public indexable URLs
// ────────────────────────────────────────────────
describe('Sitemap contains only public URLs', () => {
  let sitemapSource: string

  beforeAll(() => {
    sitemapSource = fs.readFileSync(
      path.resolve(__dirname, '../app/sitemap.ts'),
      'utf-8',
    )
  })

  it('includes root /', () => {
    expect(sitemapSource).toContain('url: baseUrl,')
  })

  it('includes /privacy', () => {
    expect(sitemapSource).toContain('/privacy')
  })

  it('includes /terms', () => {
    expect(sitemapSource).toContain('/terms')
  })

  it('includes /login/player (indexable for Google sitelinks)', () => {
    expect(sitemapSource).toContain('/login/player')
  })

  it('includes /register/player (indexable for Google sitelinks)', () => {
    expect(sitemapSource).toContain('/register/player')
  })

  it('does NOT include /replays', () => {
    expect(sitemapSource).not.toContain('/replays')
  })

  it('includes /rules (public page, indexable)', () => {
    expect(sitemapSource).toContain('/rules')
  })

  it('does NOT include /primera-riverada-los-4-ases', () => {
    expect(sitemapSource).not.toContain('/primera-riverada-los-4-ases')
  })
})

// ────────────────────────────────────────────────
// 5. Legacy SEO page redirect
// ────────────────────────────────────────────────
describe('Legacy SEO page redirects', () => {
  it('primera-riverada-los-4-ases uses permanentRedirect to /', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../app/primera-riverada-los-4-ases/page.tsx',
      ),
      'utf-8',
    )
    expect(source).toContain('permanentRedirect')
    expect(source).toContain("'/'")
  })
})

// ────────────────────────────────────────────────
// 6. Landing map section (ubicación del local)
// ────────────────────────────────────────────────
describe('Landing map section', () => {
  const landingContentPath = path.resolve(
    __dirname,
    '../components/landing/LandingContent.tsx',
  )

  it('contains a section with id="ubicacion"', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain('id="ubicacion"')
  })

  it('contains a Google Maps pin link with correct coordinates', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain('q=2.9268522,-75.2866714')
  })

  it('contains a Google Maps directions link with correct coordinates', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain('destination=2.9268522,-75.2866714')
  })

  it('contains the street address text', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain('Cra. 7 #06-87')
  })

  it('nav sections include ubicacion', () => {
    const source = fs.readFileSync(landingContentPath, 'utf-8')
    expect(source).toContain("id: 'ubicacion'")
  })
})

// ────────────────────────────────────────────────
// 7. BottomNav points to /dashboard
// ────────────────────────────────────────────────
describe('Player navigation', () => {
  it('BottomNav "Inicio" links to /dashboard', () => {
    const source = fs.readFileSync(
      path.resolve(
        __dirname,
        '../components/navigation/BottomNav.tsx',
      ),
      'utf-8',
    )
    expect(source).toContain("href: '/dashboard'")
  })
})
