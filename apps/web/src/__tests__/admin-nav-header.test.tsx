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

// ────────────────────────────────────────────────
// 1. Admin layout — clickable home title
// ────────────────────────────────────────────────
describe('Admin layout header home link', () => {
  it('renders "Panel Administrativo" as a link to /admin', async () => {
    const { default: AdminLayout } = await import(
      '@/app/(admin)/admin/layout'
    )
    render(<AdminLayout><p>dashboard</p></AdminLayout>)
    const link = screen.getByRole('link', { name: /panel administrativo/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/admin')
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
