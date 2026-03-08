"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Loader2 } from 'lucide-react'

interface ReconnectOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function ReconnectOverlay({ isVisible, message = "Intentando reconectar a la sala..." }: ReconnectOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center max-w-sm w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center relative overflow-hidden"
          >
            {/* Background warning grid */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 animate-pulse border border-red-500/20">
                <WifiOff className="w-10 h-10 text-red-500" />
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-wide mb-3">Conexión Perdida</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                {message}
              </p>
              
              <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 px-6 py-3 rounded-full border border-amber-500/20">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-bold text-sm tracking-widest uppercase">Restaurando sesión...</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
