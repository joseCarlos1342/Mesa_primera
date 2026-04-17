import fs from 'fs'
import path from 'path'

describe('Admin users mobile cards', () => {
  it('gives each user card its own container and separates header, details, and actions', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/users/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('cardClassName={() => "mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] first:mt-3 last:mb-3"}')
    expect(source).toContain('className="flex items-start gap-3 border-b border-white/5 pb-3"')
    expect(source).toContain('className="grid grid-cols-2 gap-3 pt-1"')
    expect(source).toContain('className="grid grid-cols-3 items-stretch gap-3 border-t border-white/5 pt-3"')
    expect(source).toContain('layout="mobile-split"')
  })
})