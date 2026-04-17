import fs from 'fs'
import path from 'path'

describe('Admin user sanctions control', () => {
  it('uses the predefined sanction options modal instead of a prompt', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/UserBanControl.tsx'),
      'utf-8'
    )

    expect(source).not.toContain('prompt("Motivo de la sanción:"')
    expect(source).toContain('Suspensión de Juego')
    expect(source).toContain('Suspensión Total')
    expect(source).toContain('Veto Permanente')
    expect(source).toContain('createPortal(')
    expect(source).toContain('fixed inset-0 z-50')
    expect(source).toContain('bg-slate-950/88')
    expect(source).toContain('max-h-[calc(100vh-2rem)]')
    expect(source).toContain('getActiveSanctions(userId)')
  })

  it('uses the same portal modal strategy for balance adjustments and exposes a mobile split layout', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/UserBalanceControl.tsx'),
      'utf-8'
    )

    expect(source).toContain("layout?: 'default' | 'mobile-split'")
    expect(source).toContain('createPortal(')
    expect(source).toContain('bg-slate-950/88')
    expect(source).toContain('max-h-[calc(100vh-2rem)]')
    expect(source).toContain('grid grid-cols-2 gap-3 mt-6')
  })
})