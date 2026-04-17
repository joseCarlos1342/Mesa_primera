import fs from 'fs'
import path from 'path'

describe('Admin dashboard mobile stats grid', () => {
  it('uses a two-column layout on mobile while preserving four columns on large screens', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('className="grid grid-cols-2 lg:grid-cols-4 gap-6"')
    expect(source).not.toContain('className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"')
  })

  it('lets the financial summary cards span the full mobile row for extra number space', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('label: "Fichas en Plataforma"')
    expect(source).toContain('label: "Ganancias (Rake)"')
    expect(source).toContain('mobileFullWidth: true')
    expect(source).toContain('stat.mobileFullWidth ? "col-span-2 lg:col-span-1" : ""')
  })

  it('keeps metric values on a single line with responsive sizing for large numbers', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('whitespace-nowrap')
    expect(source).toContain('tabular-nums')
    expect(source).toContain('text-[clamp(1.65rem,6vw,3rem)]')
    expect(source).not.toContain('className="text-3xl font-black tracking-tight text-white"')
  })
})