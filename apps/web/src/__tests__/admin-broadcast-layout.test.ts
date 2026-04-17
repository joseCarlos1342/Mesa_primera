import fs from 'fs'
import path from 'path'

describe('Admin broadcast layout copy', () => {
  it('removes the eyebrow copy and shortens the primary submit label', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/broadcast/page.tsx'),
      'utf-8'
    )

    expect(source).not.toContain('Operations Center')
    expect(source).not.toContain('EJECUTAR COMANDO GLOBAL')
    expect(source).toContain('EJECUTAR')
  })

  it('keeps broadcast history free of an inline return link because the topbar handles it', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/broadcast/history/page.tsx'),
      'utf-8'
    )

    expect(source).not.toContain('Volver a Broadcast')
  })
})