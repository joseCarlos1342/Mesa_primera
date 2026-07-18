import Link from 'next/link'
import { ArrowLeft, ExternalLink, Landmark } from 'lucide-react'
import { getAdminRecoveryRefunds } from '@/app/actions/admin-recovery'
import { formatCurrency } from '@/utils/format'
import { RefundReconciliation } from './RefundReconciliation'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  failed: 'Fallido',
}

export default async function RecoveryRefundsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const refunds = await getAdminRecoveryRefunds(gameId)

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <header className="border-b border-white/5 pb-6">
        <Link href="/admin/recovery" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-tertiary hover:text-text-primary"><ArrowLeft className="size-3" /> Volver a recovery</Link>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10"><Landmark className="size-6 text-primary-light" /></div>
          <div><h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Refunds del incidente</h1><p className="mt-1 font-mono text-xs text-text-tertiary">Juego {gameId}</p></div>
        </div>
      </header>
      <section className="overflow-x-auto rounded-2xl border border-white/5 bg-surface-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted"><tr><th className="px-5 py-4">Jugador</th><th className="px-5 py-4">Monto</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Auditoría</th></tr></thead>
          <tbody>{refunds.map((refund) => <tr key={refund.refundId} className="border-b border-white/5 last:border-0"><td className="px-5 py-4"><Link href={`/admin/ledger/${refund.userId}`} className="inline-flex items-center gap-2 font-mono text-xs text-emerald-300 hover:text-emerald-200">Historial del jugador <ExternalLink className="size-3" /></Link></td><td className="px-5 py-4 font-mono font-bold text-text-primary">{formatCurrency(refund.amountCents)}</td><td className="px-5 py-4"><span className={refund.status === 'completed' ? 'text-success' : 'text-warning'}>{STATUS_LABEL[refund.status]}</span></td><td className="px-5 py-4">{refund.ledgerId ? <Link href={`/admin/ledger?q=${encodeURIComponent(refund.ledgerId)}`} className="inline-flex items-center gap-2 text-primary-light hover:text-text-primary">Movimiento ledger <ExternalLink className="size-3" /></Link> : <><span className="text-text-muted">Sin movimiento registrado</span><div className="mt-3"><RefundReconciliation refundId={refund.refundId} /></div></>}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  )
}
