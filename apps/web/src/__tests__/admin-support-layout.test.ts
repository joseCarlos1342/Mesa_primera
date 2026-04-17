import fs from 'fs'
import path from 'path'

describe('Admin support mobile layout', () => {
  it('does not show the dashboard eyebrow copy in the support page header', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/support/page.tsx'),
      'utf-8'
    )

    expect(source).not.toContain('Panel de Control')
  })

  it('hides the support channels label on mobile while preserving it on desktop', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/SupportConversationList.tsx'),
      'utf-8'
    )

    expect(source).toContain('className="flex items-center justify-center px-2 shrink-0 lg:justify-between"')
    expect(source).toContain('className="hidden text-[10px] font-black text-slate-500 uppercase tracking-widest lg:block"')
    expect(source).toContain('PENDIENTES')
    expect(source).toContain('ATENDIDOS')
    expect(source).toContain('FINALIZADOS')
  })
})