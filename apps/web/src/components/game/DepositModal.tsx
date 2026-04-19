'use client'

import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getGameModalOverlayClassName } from './modal-overlay'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

import { DepositForm } from './DepositForm'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      <div className={getGameModalOverlayClassName()}>
          <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative bg-gradient-to-br from-[#1b4d3e] via-[#1b4d3e] to-[#0d211a] border-[#c0a060]/40 border-2 w-full h-full sm:h-auto sm:max-h-[85vh] lg:max-h-[calc(100vh-80px)] sm:max-w-sm md:max-w-md lg:max-w-lg sm:rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col"
        >
          {/* Decorative Pattern Layer */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/textures/noise.png')] mix-blend-overlay" />
          <div className="absolute top-0 left-0 w-full h-96 bg-accent-gold/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
          
          <div className="p-6 md:p-8 pb-4 landscape:p-4 landscape:pb-2 lg:landscape:p-6 lg:landscape:pb-3 flex justify-between items-start relative z-10">
            <div className="space-y-1 pt-1">
              <h2 className="text-3xl lg:text-3xl landscape:text-2xl font-display font-black italic text-accent-gold-shimmer leading-none tracking-tight select-none uppercase drop-shadow-premium whitespace-nowrap">
                Cargar <span className="ml-[0.1em]">Saldo</span>
              </h2>
            </div>
            
            <button 
              onClick={onClose} 
              className="w-12 h-12 landscape:w-10 landscape:h-10 bg-black/40 hover:bg-black/60 rounded-2xl flex items-center justify-center transition-all border-2 border-[#c0a060]/20 hover:border-[#c0a060]/50 active:scale-90 group shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6 landscape:w-5 landscape:h-5 text-[#f3edd7] group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 px-6 md:px-8 landscape:px-4 lg:landscape:px-6 pb-16 landscape:pb-6 pt-2 landscape:pt-0 relative z-10">
            <DepositForm onSuccess={onClose} />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
