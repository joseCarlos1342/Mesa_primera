import Link from 'next/link'
import { Menu, ShoppingCart, LogOut, Settings, HelpCircle, X, Mic, Headphones } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function GameHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
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
    <>
    <header className="absolute top-0 left-0 w-full flex h-14 md:h-16 items-center justify-between px-4 md:px-6 bg-transparent pointer-events-none z-50 landscape:h-12 md:landscape:h-16">
      {/* Top Left: Hamburger Menu */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="p-2 -ml-2 rounded-md hover:bg-[#d4af37]/10 transition-colors relative z-50 pointer-events-auto"
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
              className="absolute top-14 left-0 w-64 bg-[#0d211a]/95 backdrop-blur-xl border border-[#c0a060]/30 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(192,160,96,0.15)] overflow-hidden flex flex-col py-2 pointer-events-auto"
            >
              <div className="px-4 py-3 border-b border-[#c0a060]/15">
                <p className="text-[#c0a060]/70 text-xs font-black tracking-widest uppercase">Opciones de Mesa</p>
              </div>
              
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-player-audio-modal'));
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1b4d3e]/60 transition-colors text-[#f3edd7]/70 group"
              >
                <Mic className="w-5 h-5 group-hover:text-[#c0a060] transition-colors" />
                <span className="font-medium group-hover:text-[#f3edd7] transition-colors">Audio de Jugadores</span>
              </button>

              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-rules-modal'));
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1b4d3e]/60 transition-colors text-[#f3edd7]/70 group"
              >
                <HelpCircle className="w-5 h-5 group-hover:text-[#c0a060] transition-colors" />
                <span className="font-medium group-hover:text-[#f3edd7] transition-colors">Reglas del Juego</span>
              </button>

              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-support-chat'));
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#c0a060]/10 transition-colors text-[#c0a060] group"
              >
                <Headphones className="w-5 h-5 group-hover:text-[#e2b044] transition-colors" />
                <span className="font-bold group-hover:text-[#e2b044] transition-colors">Llamar al Admin</span>
              </button>
              
              <div className="my-1 border-t border-[#c0a060]/10" />

              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowExitConfirm(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 transition-colors text-red-400 group"
              >
                <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
                <span className="font-bold tracking-wide group-hover:text-red-400 transition-colors uppercase">Abandonar Partida</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center: Empty (Title moved to Board felt) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Top Right: Shopping Cart */}
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('open-recharge-modal'))}
        className="p-2 -mr-2 rounded-md hover:bg-[#d4af37]/10 transition-colors pointer-events-auto"
      >
        <ShoppingCart className="w-7 h-7 text-[#fdf0a6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform" />
      </button>
    </header>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d211a] border-2 border-red-500/20 rounded-[2rem] p-6 md:p-8 landscape:p-4 max-w-sm md:max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(239,68,68,0.1)] text-center relative overflow-y-auto max-h-[95vh] landscape:max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-40" />
              
              <div className="w-16 h-16 landscape:w-10 landscape:h-10 landscape:mb-2 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <LogOut className="w-8 h-8 landscape:w-5 landscape:h-5 text-red-400" />
              </div>
              
              <h2 className="text-2xl md:text-3xl landscape:text-xl font-black text-[#f3edd7] mb-2 landscape:mb-1 uppercase tracking-widest font-display">
                ¿Abandonar Mesa?
              </h2>
              
              <p className="text-[#f3edd7]/40 text-sm md:text-base landscape:text-xs mb-6 landscape:mb-4 leading-relaxed px-2">
                Si abandonas la partida ahora, <strong className="text-red-400">perderás las fichas que ya apostaste</strong>, se quedarán en la mesa.
              </p>
              
              <div className="flex gap-3 landscape:gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 px-4 landscape:py-2 min-h-[48px] rounded-xl bg-[#1b4d3e]/40 hover:bg-[#1b4d3e]/70 border border-[#c0a060]/15 text-[#f3edd7] font-bold text-sm landscape:text-xs uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-[#c0a060]/30 tactile-button"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    if (onMenuClick) onMenuClick();
                  }}
                  className="flex-1 py-3 px-4 landscape:py-2 min-h-[48px] rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border border-red-500/40 text-white font-bold text-sm landscape:text-xs uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(220,38,38,0.3)] hover:-translate-y-1 active:translate-y-1 hover:shadow-[0_8px_25px_rgba(220,38,38,0.5)] focus:outline-none focus:ring-2 focus:ring-red-400 tactile-button"
                >
                  Sí, Salir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  )
}
