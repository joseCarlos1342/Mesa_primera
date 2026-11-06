import type { ReactNode } from 'react'
import landing from '@/components/landing/landing.module.css'
import { formatAmount } from '@/utils/format'

interface BalancePanelProps {
  readonly cents: number | null | undefined
  readonly label?: string
  readonly note?: ReactNode
  /** Acciones bajo el saldo. */
  readonly children?: ReactNode
}

/** Saldo sobre paño con canto de nogal: la única superficie de mesa de la app. */
export function BalancePanel({ cents, label = 'Tu saldo', note, children }: BalancePanelProps) {
  return (
    <section
      aria-label={label}
      className={`${landing.felt} ${landing.rim} overflow-hidden rounded-xl px-6 pb-6 pt-7 sm:px-9 sm:pb-8 sm:pt-9`}
    >
      <p className="text-lg font-semibold text-[#d9d3bf]">{label}</p>
      <p className="mt-1 font-mono font-medium leading-none tracking-[-0.03em] text-text-premium tabular-nums [font-size:clamp(2.75rem,12vw,4rem)]">
        <span className="mr-1 text-[0.6em] text-[#c5a059]">$</span>
        {formatAmount(cents ?? 0)}
      </p>
      {note && <p className="mt-3 text-base text-[#d9d3bf]">{note}</p>}
      {children && <div className="mt-7">{children}</div>}
    </section>
  )
}
