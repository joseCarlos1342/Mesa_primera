'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styles from './player.module.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface PlayerSheetProps {
  readonly open: boolean
  readonly onClose: () => void
  /** Título visible de la hoja (enlazado con `aria-labelledby`). */
  readonly title: ReactNode
  readonly description?: ReactNode
  /**
   * `sheet`: hoja inferior en móvil y diálogo centrado desde `sm`.
   * `full`: pantalla completa en móvil y panel lateral derecho desde `sm` (chats).
   */
  readonly variant?: 'sheet' | 'full'
  /** Acciones fijas al pie (botón principal y secundario). */
  readonly footer?: ReactNode
  /** Contenido extra a la izquierda del botón de cerrar (p. ej. volver). */
  readonly headerStart?: ReactNode
  readonly closeLabel?: string
  readonly children: ReactNode
  readonly className?: string
}

/**
 * Hoja modal de la app del jugador. Atrapa el foco, cierra con Escape o tocando
 * el fondo, bloquea el scroll del documento y devuelve el foco al disparador.
 */
export function PlayerSheet({
  open,
  onClose,
  title,
  description,
  variant = 'sheet',
  footer,
  headerStart,
  closeLabel = 'Cerrar',
  children,
  className = '',
}: PlayerSheetProps) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
    first?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === firstItem || active === panelRef.current)) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previous?.focus?.()
    }
  }, [open])

  if (!open || !mounted) return null

  const full = variant === 'full'
  const layout = full
    ? 'inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-md'
    : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl'

  return createPortal(
    <div className="player-layout fixed inset-0 z-[300] font-sans text-text-premium">
      <div data-testid="sheet-backdrop" aria-hidden="true" className={`absolute inset-0 ${styles.backdrop}`} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`absolute flex flex-col overflow-hidden outline-none ${styles.sheet} ${full ? styles.sheetFull : ''} ${layout} ${className}`}
      >
        {!full && (
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
            <span className={styles.handle} />
          </div>
        )}
        <header
          className={`flex shrink-0 items-start gap-3 px-5 pb-4 sm:px-7 ${full ? 'border-b border-[#8b6b2e]/45 pt-[max(1rem,env(safe-area-inset-top))]' : 'pt-3 sm:pt-6'} [@media(max-height:480px)]:pb-2 [@media(max-height:480px)]:pt-3`}
        >
          {headerStart}
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 id={titleId} className="text-balance font-display text-[1.625rem] font-bold leading-tight text-text-premium [@media(max-height:480px)]:text-[1.375rem]">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1.5 text-base leading-relaxed text-[#bdb7a6] [@media(max-height:480px)]:mt-0.5 [@media(max-height:480px)]:text-sm">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-[#d9d3bf] transition-colors hover:bg-[#35180f] hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-7">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[#8b6b2e]/45 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-7 sm:pb-6 [@media(max-height:480px)]:py-2 [@media(max-height:480px)]:[&_button]:min-h-11 [@media(max-height:480px)]:[&_a]:min-h-11">
            {footer}
          </div>
        )}
        {!footer && <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" aria-hidden="true" />}
      </div>
    </div>,
    document.body,
  )
}
