import { Menu, ShoppingCart, LogOut, HelpCircle, X, Mic, Headphones, Maximize, Minimize, ArrowRightLeft } from 'lucide-react'
import { useState, useRef, useEffect, type ComponentType, type SVGProps } from 'react'
import { useFullscreen } from '@/hooks/useFullscreen'
import { ConfirmDialog } from '@/components/player/ConfirmDialog'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

interface MenuItemProps {
  readonly icon: IconType
  readonly label: string
  readonly onSelect: () => void
  readonly tone?: 'default' | 'danger'
}

function MenuItem({ icon: Icon, label, onSelect, tone = 'default' }: MenuItemProps) {
  const danger = tone === 'danger'
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex min-h-12 w-full items-center gap-3 px-4 text-left text-base font-semibold transition-colors focus-visible:bg-[#1b0d08] focus-visible:outline-none ${
        danger ? 'text-[#f08a7e] hover:bg-[#2a0f0c]' : 'text-text-premium hover:bg-[#1b0d08] hover:text-brand-gold-light'
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${danger ? 'text-[#f08a7e]' : 'text-[#c5a059]'}`} aria-hidden="true" />
      {label}
    </button>
  )
}

const iconButton =
  'pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#8b6b2e]/70 bg-[#120806]/85 text-[#fdf0a6] shadow-[0_6px_14px_rgba(0,0,0,0.6)] transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light md:h-12 md:w-12 landscape:h-10 landscape:w-10 md:landscape:h-12 md:landscape:w-12'

export function GameHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggle: toggleFullscreen, isSupported: fsSupported } = useFullscreen()

  // Cierra el menú al tocar fuera o con Escape.
  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isMenuOpen])

  const select = (action: () => void) => () => {
    setIsMenuOpen(false)
    action()
  }
  const emit = (name: string) => () => window.dispatchEvent(new CustomEvent(name))

  return (
    <>
      <header className="pointer-events-none absolute left-0 top-0 z-50 flex h-14 w-full items-center justify-between px-3 pt-[env(safe-area-inset-top,0px)] md:h-16 md:px-6 landscape:h-12 md:landscape:h-16">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Cerrar opciones de la mesa' : 'Opciones de la mesa'}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className={`${iconButton} relative z-50`}
          >
            {isMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              aria-label="Opciones de la mesa"
              className="pointer-events-auto absolute left-0 top-[calc(100%+0.5rem)] flex max-h-[calc(100dvh-5rem)] w-64 flex-col overflow-y-auto rounded-xl border border-[#8b6b2e] bg-[#120806]/97 py-1.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(240,170,105,0.28)] motion-safe:animate-[toast-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
            >
              <p className="px-4 pb-1.5 pt-1 font-display text-lg font-bold text-text-premium">Opciones de la mesa</p>
              <div className="border-t border-[#8b6b2e]/45" />
              <MenuItem icon={Mic} label="Audio de jugadores" onSelect={select(emit('open-player-audio-modal'))} />
              <MenuItem icon={HelpCircle} label="Reglas del juego" onSelect={select(emit('open-rules-modal'))} />
              <MenuItem icon={Headphones} label="Llamar al admin" onSelect={select(emit('open-table-help'))} />
              <MenuItem icon={ArrowRightLeft} label="Transferir saldo" onSelect={select(emit('open-transfer-modal'))} />
              <MenuItem icon={ShoppingCart} label="Cargar saldo" onSelect={select(emit('open-recharge-modal'))} />
              {fsSupported && (
                <MenuItem
                  icon={isFullscreen ? Minimize : Maximize}
                  label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  onSelect={select(() => { void toggleFullscreen() })}
                />
              )}
              <div className="my-1 border-t border-[#8b6b2e]/45" />
              <MenuItem icon={LogOut} label="Abandonar partida" tone="danger" onSelect={select(() => setShowExitConfirm(true))} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-recharge-modal'))}
          aria-label="Cargar saldo"
          title="Cargar saldo"
          className={iconButton}
        >
          <ShoppingCart className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      <ConfirmDialog
        open={showExitConfirm}
        tone="danger"
        title="¿Abandonar la mesa?"
        description="Si sales ahora, las fichas que ya apostaste se quedan en la mesa."
        confirmLabel="Sí, salir"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false)
          if (onMenuClick) onMenuClick()
        }}
      />
    </>
  )
}
