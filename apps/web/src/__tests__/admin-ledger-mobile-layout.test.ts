import fs from 'fs'
import path from 'path'

describe('Admin ledger mobile cards', () => {
  it('uses only the player name in the ledger detail title and keeps it on one line', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/ledger/[userId]/page.tsx'),
      'utf-8'
    )

    expect(source).not.toContain('DESGLOSE:')
    expect(source).not.toContain('Volver al Ledger')
    expect(source).toContain('whitespace-nowrap')
    expect(source).toContain('text-[clamp(1rem,5vw,2.75rem)]')
    expect(source).toContain("profile?.full_name || profile?.username || 'Desconocido'")
  })

  it('uses the shorter ledger page title without the english suffix', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/ledger/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('LIBRO MAYOR')
    expect(source).not.toContain('LIBRO MAYOR (LEDGER)')
  })

  it('stacks the user search controls on mobile so the total card does not overflow', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/LedgerFilters.tsx'),
      'utf-8'
    )

    const userSection = source.match(
      /export function LedgerUsersFilter[\s\S]*?export function LedgerTransactionsFilter/
    )?.[0]

    expect(userSection).toBeDefined()
    expect(userSection).toContain('className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center"')
    expect(userSection).toContain('className="pl-10 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors w-full md:w-60"')
    expect(userSection).toContain('className="flex w-full items-center justify-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl md:w-auto md:justify-start"')
  })

  it('gives each mobile user summary card its own visual container', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/LedgerFilters.tsx'),
      'utf-8'
    )

    const userSection = source.match(
      /export function LedgerUsersFilter[\s\S]*?export function LedgerTransactionsFilter/
    )?.[0]

    expect(userSection).toBeDefined()
    expect(userSection).toContain('cardClassName={() => "mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] first:mt-3 last:mb-3"}')
  })

  it('keeps the global ledger card timestamp isolated at the top and uses only two-column rows', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/LedgerFilters.tsx'),
      'utf-8'
    )

    expect(source).toContain('border-b border-white/5 pb-2')
    expect(source).toContain('grid grid-cols-2 gap-3')
    expect(source).not.toContain('grid grid-cols-3 gap-3')
    expect(source).toContain('whitespace-nowrap')
    expect(source).toContain('mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30')
    expect(source).toContain('inline-flex items-center gap-2 whitespace-nowrap')
    expect(source).toContain('Completado')
  })

  it('keeps the user ledger detail card timestamp isolated at the top and uses only two-column rows', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/UserLedgerTable.tsx'),
      'utf-8'
    )

    expect(source).toContain('border-b border-white/5 pb-2')
    expect(source).toContain('grid grid-cols-2 gap-3')
    expect(source).not.toContain('grid grid-cols-3 gap-3')
    expect(source).toContain('whitespace-nowrap')
    expect(source).toContain('mx-3 my-3 rounded-2xl border border-white/5 bg-slate-950/30')
    expect(source).toContain('inline-flex items-center gap-2 whitespace-nowrap')
    expect(source).toContain('Completado')
  })
})