'use client'

import { DepositForm } from './DepositForm'
import { PlayerSheet } from '@/components/player/PlayerSheet'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Cargar saldo sin salir del lobby ni de la mesa: misma hoja y formulario que la Billetera. */
export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  return (
    <PlayerSheet
      open={isOpen}
      onClose={onClose}
      title="Cargar saldo"
      description="Paga por Nequi y sube la captura del comprobante."
      closeLabel="Cerrar"
    >
      <div className="pt-2">
        <DepositForm onSuccess={onClose} />
      </div>
    </PlayerSheet>
  )
}
