import fs from 'fs'
import path from 'path'

describe('Admin tables mobile layout', () => {
  it('uses honest live-rooms empty copy instead of a hardcoded server region', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/tables/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('No hay partidas activas en este momento.')
    expect(source).not.toContain('Buscando actividad en el servidor US-EAST-1...')
  })

  it('gives financial and table-management mobile cards their own visual container and section separation', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/tables/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('cardClassName={() => "mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] first:mt-3 last:mb-3"}')
    expect(source).toContain('className="flex items-start gap-3 border-b border-white/5 pb-3"')
    expect(source).toContain('className="grid grid-cols-2 gap-3 pt-1"')
    expect(source).toContain('className="flex items-center justify-between border-t border-white/5 pt-3 text-xs"')
    expect(source).toContain('className="flex items-start justify-between gap-3 border-b border-white/5 pb-3"')
    expect(source).toContain('className="grid grid-cols-2 gap-3 pt-1"')
    expect(source).toContain('className="flex justify-end gap-2 border-t border-white/5 pt-3"')
  })

  it('keeps live-room internals responsive on mobile when there are active games', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/tables/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6"')
    expect(source).toContain('className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between group/player hover:bg-white/10 transition-colors shadow-sm"')
    expect(source).toContain('className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"')
  })
})