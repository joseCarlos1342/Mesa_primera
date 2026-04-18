import fs from 'fs'
import path from 'path'

describe('Admin ganancias mobile layout', () => {
  it('uses the shorter ganancias title and gives each mobile history card its own cleaner structure', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/ganancias/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('GANANCIAS 5%')
    expect(source).not.toContain('GANANCIAS — RAKE 5%')
    expect(source).toContain('cardClassName={() => "mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] first:mt-3 last:mb-3"}')
    expect(source).toContain('className="flex items-start justify-between gap-3 border-b border-white/5 pb-3"')
    expect(source).toContain('className="grid grid-cols-2 gap-3"')
    expect(source).toContain('className="col-span-2 rounded-2xl border border-white/5 bg-white/3 p-3"')
    expect(source).toContain('text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1')
  })

  it('replaces the visible rake copy with ganancia labels', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/ganancias/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('header: "Ganancia (Casa)"')
    expect(source).toContain('>Ganancia</p>')
    expect(source).toContain('emptyMessage="No hay ganancias registradas aún."')
    expect(source).not.toContain('header: "Rake (Casa)"')
    expect(source).not.toContain('>Rake</p>')
    expect(source).not.toContain('emptyMessage="No hay cobros de rake registrados aún."')
  })

  it('matches the financial labels used in mesas for winner and total amounts', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/ganancias/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('header: "Premios"')
    expect(source).toContain('header: "Total Apostado"')
    expect(source).toContain('>Premios</p>')
    expect(source).toContain('>Total Apostado</p>')
    expect(source).not.toContain('header: "Pozo Neto (Ganador)"')
    expect(source).not.toContain('header: "Pozo Total"')
    expect(source).not.toContain('>Pozo Neto</p>')
    expect(source).not.toContain('>Pozo Total</p>')
  })
})