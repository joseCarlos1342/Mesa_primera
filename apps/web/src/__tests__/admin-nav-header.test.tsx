/**
 * RED phase — Admin navigation header redesign.
 *
 * Covers:
 * - Admin layout exposes a visible link "Panel Administrativo" → /admin
 * - First-level admin subpages no longer contain redundant back-to-dashboard links
 */
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { usePathname } from 'next/navigation'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// ────────────────────────────────────────────────
// 1. Admin layout — clickable home title
// ────────────────────────────────────────────────
describe('Admin layout header home link', () => {
  beforeEach(() => {
    jest.mocked(usePathname).mockReturnValue('/admin')
  })

  it('renders "Admin" as a link to /admin', async () => {
    const { default: AdminLayout } = await import(
      '@/app/(admin)/admin/layout'
    )
    render(<AdminLayout><p>dashboard</p></AdminLayout>)
    const link = screen.getByRole('link', { name: /^admin$/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/admin')
  })

  it('shows the broadcast shortcut in the topbar on /admin', async () => {
    const { default: AdminLayout } = await import(
      '@/app/(admin)/admin/layout'
    )
    render(<AdminLayout><p>dashboard</p></AdminLayout>)

    const broadcastLink = screen.getByRole('link', { name: /nuevo broadcast/i })
    expect(broadcastLink).toBeInTheDocument()
    expect(broadcastLink).toHaveAttribute('href', '/admin/broadcast')
  })

  it('keeps broadcast and sign-out controls on matching topbar sizes', async () => {
    const { default: AdminLayout } = await import(
      '@/app/(admin)/admin/layout'
    )
    render(<AdminLayout><p>dashboard</p></AdminLayout>)

    const broadcastLink = screen.getByRole('link', { name: /nuevo broadcast/i })
    const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i })

    expect(broadcastLink.className).toContain('h-11')
    expect(broadcastLink.className).toContain('w-11')
    expect(signOutButton.className).toContain('h-11')
    expect(signOutButton.className).toContain('w-11')
  })

  it('hides the broadcast shortcut outside the admin dashboard root', async () => {
    jest.mocked(usePathname).mockReturnValue('/admin/users')

    const { default: AdminLayout } = await import(
      '@/app/(admin)/admin/layout'
    )
    render(<AdminLayout><p>dashboard</p></AdminLayout>)

    expect(screen.queryByRole('link', { name: /nuevo broadcast/i })).not.toBeInTheDocument()
  })

  it('shows a compact ledger return icon next to sign-out on ledger detail pages', async () => {
    jest.mocked(usePathname).mockReturnValue('/admin/ledger/user-123')

    const { default: AdminLayout } = await import(
      '@/app/(admin)/admin/layout'
    )
    render(<AdminLayout><p>detalle</p></AdminLayout>)

    const backLink = screen.getByRole('link', { name: /volver al libro mayor/i })
    const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i })

    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/admin/ledger')
    expect(backLink.className).toContain('h-11')
    expect(backLink.className).toContain('w-11')
    expect(signOutButton.className).toContain('h-11')
    expect(signOutButton.className).toContain('w-11')
    expect(screen.queryByRole('link', { name: /nuevo broadcast/i })).not.toBeInTheDocument()
  })
})

// ────────────────────────────────────────────────
// 2. First-level admin pages — no redundant back links
// ────────────────────────────────────────────────
const FIRST_LEVEL_PAGES = [
  { name: 'broadcast', file: '../app/(admin)/admin/broadcast/page.tsx' },
  { name: 'alerts',    file: '../app/(admin)/admin/alerts/page.tsx' },
  { name: 'audit',     file: '../app/(admin)/admin/audit/page.tsx' },
  { name: 'deposits',  file: '../app/(admin)/admin/deposits/page.tsx' },
  { name: 'withdrawals', file: '../app/(admin)/admin/withdrawals/page.tsx' },
  { name: 'ganancias', file: '../app/(admin)/admin/ganancias/page.tsx' },
]

describe('First-level admin pages have no redundant dashboard return link', () => {
  for (const { name, file } of FIRST_LEVEL_PAGES) {
    it(`${name}/page.tsx does not contain a Link back to /admin`, () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, file),
        'utf-8'
      )
      // Must not contain a <Link href="/admin" pattern (the global header handles it)
      expect(source).not.toMatch(/href=["']\/admin["']/)
    })
  }
})
