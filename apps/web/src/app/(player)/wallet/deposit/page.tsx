"use client"
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { DepositForm } from '@/components/game/DepositForm'
import { PageHeader } from '@/components/player/PlayerUI'

function DepositContent() {
  const searchParams = useSearchParams()
  const initialAmount = searchParams.get('amount') || ''
  const router = useRouter()

  return (
    <div className="max-w-xl">
      <PageHeader
        back={{ href: '/wallet', label: 'Billetera' }}
        title="Cargar saldo"
        lead="Paga por Nequi y sube la captura del comprobante."
      />
      <DepositForm
        initialAmount={initialAmount}
        onSuccess={() => router.push('/wallet')}
      />
    </div>
  )
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <DepositContent />
    </Suspense>
  )
}
