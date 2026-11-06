'use client'

import { ExternalLink, FileText } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { PlayerSheet } from '@/components/player/PlayerSheet'
import { Money, StatusTag, Skeleton } from '@/components/player/PlayerUI'
import { formatTxDate, isCredit, transactionLabel, type PlayerTransaction } from '@/components/player/transactions'

interface TransactionModalProps {
  transaction: PlayerTransaction | null
  isOpen: boolean
  onClose: () => void
}

function channelLabel(type: string) {
  if (type === 'deposit') return 'Transferencia Nequi'
  if (type === 'withdrawal') return 'Retiro a cuenta'
  if (type === 'transfer') return 'Entre jugadores'
  return 'Sistema'
}

/** Detalle de un movimiento en hoja inferior (diálogo en escritorio). */
export function TransactionModal({ transaction, isOpen, onClose }: TransactionModalProps) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function resolveUrl() {
      if (transaction?.proof_url) {
        // URL firmada primero (bucket privado); pública como respaldo.
        const { data, error } = await supabase.storage.from('deposits').createSignedUrl(transaction.proof_url, 3600)
        if (!error && data?.signedUrl) {
          setPublicUrl(data.signedUrl)
        } else {
          const {
            data: { publicUrl: url },
          } = supabase.storage.from('deposits').getPublicUrl(transaction.proof_url)
          setPublicUrl(url)
        }
      } else {
        setPublicUrl(null)
      }
    }
    resolveUrl()
  }, [transaction, supabase.storage])

  if (!transaction) return null

  const credit = isCredit(transaction)
  const label = transactionLabel(transaction)

  return (
    <PlayerSheet open={isOpen} onClose={onClose} title={label} description={formatTxDate(transaction.created_at)} closeLabel="Cerrar detalle">
      <div className="flex flex-wrap items-center gap-3 pb-6">
        <Money
          cents={transaction.amount_cents}
          direction={credit ? 'credit' : 'debit'}
          className="text-[2.5rem] font-medium leading-none"
        />
        <StatusTag status={transaction.status} />
      </div>

      <dl className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
        <DetailRow label="Fecha">
          {new Date(transaction.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
        </DetailRow>
        <DetailRow label="Canal">{channelLabel(transaction.type)}</DetailRow>
        {typeof transaction.balance_after_cents === 'number' && (
          <DetailRow label="Saldo después">
            <Money cents={transaction.balance_after_cents} />
          </DetailRow>
        )}
        <DetailRow label="Referencia">
          <span className="break-all font-mono text-[0.95rem] text-[#d9d3bf]">{transaction.id}</span>
        </DetailRow>
      </dl>

      {transaction.description && <Note title="Descripción">{transaction.description}</Note>}
      {transaction.observations && <Note title="Tus notas">{transaction.observations}</Note>}

      {transaction.type === 'deposit' && transaction.proof_url && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-text-premium">Comprobante</p>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4"
              >
                Ver completo
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#8b6b2e]/55 bg-[#0a0a0a]">
            {publicUrl ? (
              <img src={publicUrl} alt="Comprobante de la carga" className="h-auto max-h-96 w-full object-contain" />
            ) : (
              <div className="flex items-center gap-3 p-4" role="status">
                <Skeleton className="h-16 w-16 shrink-0" />
                <p className="text-base text-[#bdb7a6]">Cargando comprobante…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </PlayerSheet>
  )
}

function DetailRow({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="shrink-0 text-base text-[#bdb7a6]">{label}</dt>
      <dd className="min-w-0 text-right text-lg text-text-premium">{children}</dd>
    </div>
  )
}

function Note({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="flex items-center gap-2 text-base font-semibold text-text-premium">
        <FileText className="h-4 w-4 text-[#c5a059]" aria-hidden="true" />
        {title}
      </p>
      <p className="mt-1.5 text-lg leading-relaxed text-[#d9d3bf] [overflow-wrap:anywhere]">{children}</p>
    </div>
  )
}
