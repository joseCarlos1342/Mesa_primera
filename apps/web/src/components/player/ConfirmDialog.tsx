'use client'

import type { ReactNode } from 'react'
import { PlayerSheet } from './PlayerSheet'
import { playerButton } from './PlayerUI'

interface ConfirmDialogProps {
  readonly open: boolean
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly children?: ReactNode
  readonly confirmLabel: string
  /** Texto mientras se ejecuta la acción. */
  readonly busyLabel?: string
  /** `null` oculta el botón de cancelar (aviso de un solo botón). */
  readonly cancelLabel?: string | null
  /** `danger` para acciones destructivas (salir, eliminar, abandonar). */
  readonly tone?: 'primary' | 'danger'
  readonly busy?: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/**
 * Confirmación o aviso de la app del jugador. Sustituye a `window.confirm` y
 * `window.alert`: hoja inferior en móvil, diálogo centrado desde `sm`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass = tone === 'danger' ? playerButton.dangerSolid : playerButton.primary
  return (
    <PlayerSheet
      open={open}
      onClose={() => { if (!busy) onCancel() }}
      title={title}
      description={description}
      closeLabel={cancelLabel ?? 'Cerrar'}
      footer={
        <div className={cancelLabel ? 'grid grid-cols-2 gap-3' : 'grid'}>
          {cancelLabel && (
            <button type="button" onClick={onCancel} disabled={busy} data-autofocus={tone === 'danger' ? true : undefined} className={`${playerButton.secondary} disabled:opacity-60`}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
            data-autofocus={tone === 'danger' && cancelLabel ? undefined : true}
            className={`${confirmClass} disabled:opacity-60`}
          >
            {busy && busyLabel ? busyLabel : confirmLabel}
          </button>
        </div>
      }
    >
      {children ?? <span className="sr-only">{typeof description === 'string' ? description : ''}</span>}
    </PlayerSheet>
  )
}
