import Link from 'next/link'
import { Menu, ShoppingCart, LogOut, Settings, HelpCircle, X, Mic } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function GameHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cierra el menú si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <header className="flex h-14 md:h-16 w-full items-center justify-between px-4 md:px-6 bg-[#0c1220]/80 backdrop-blur-md border-b border-[#c0a060]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative z-50 landscape:h-12 md:landscape:h-16">
      {/* Top Left: Hamburger Menu */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="p-2 -ml-2 rounded-md hover:bg-[#d4af37]/10 transition-colors relative z-50"
        >
          {isMenuOpen ? (
            <X className="w-8 h-8 text-[#fdf0a6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          ) : (
            <Menu className="w-8 h-8 text-[#fdf0a6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          )}
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-14 left-0 w-64 bg-[#0c1220]/95 backdrop-blur-xl border border-[#d4af37]/30 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(212,175,55,0.2)] overflow-hidden flex flex-col py-2"
            >
              <div className="px-4 py-3 border-b border-[#d4af37]/10">
                <p className="text-[#8a6d1c] text-xs font-black tracking-widest uppercase">Opciones de Mesa</p>
              </div>
              
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-player-audio-modal'));
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1b253b]/80 transition-colors text-slate-300 group"
              >
                <Mic className="w-5 h-5 group-hover:text-[#d4af37] transition-colors" />
                <span className="font-medium group-hover:text-white transition-colors">Audio de Jugadores</span>
              </button>

              <Link 
                href="/profile"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1b253b]/80 transition-colors text-slate-300 group"
              >
                <Settings className="w-5 h-5 group-hover:text-[#d4af37] transition-colors" />
                <span className="font-medium group-hover:text-white transition-colors">Ajustes / Perfil</span>
              </Link>

              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-rules-modal'));
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1b253b]/80 transition-colors text-slate-300 group"
              >
                <HelpCircle className="w-5 h-5 group-hover:text-[#d4af37] transition-colors" />
                <span className="font-medium group-hover:text-white transition-colors">Reglas del Juego</span>
              </button>
              
              <div className="my-1 border-t border-white/5" />

              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onMenuClick) onMenuClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 transition-colors text-red-400 group"
              >
                <LogOut className="w-5 h-5 group-hover:text-red-300 transition-colors" />
                <span className="font-bold tracking-wide group-hover:text-red-300 transition-colors">Salir al Lobby Central</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center: Game Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-full flex justify-center">
        <h1 className="text-sm md:text-2xl font-serif font-bold tracking-tight md:tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-[180px] md:max-w-none leading-tight" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8), 0px 0px 2px rgba(212,175,55,0.4)', WebkitTextStroke: '0.3px rgba(138, 109, 28, 0.5)' }}>
          Juego de primera: los 4 ases
        </h1>
      </div>

      {/* Top Right: Shopping Cart */}
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('open-recharge-modal'))}
        className="p-2 -mr-2 rounded-md hover:bg-[#d4af37]/10 transition-colors"
      >
        <ShoppingCart className="w-7 h-7 text-[#fdf0a6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" />
      </button>

    </header>
  )
}
