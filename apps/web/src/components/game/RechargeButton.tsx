'use client'

import { ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { DepositModal } from './DepositModal'

export function RechargeButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white p-3 md:px-5 md:py-3 rounded-2xl shadow-lg border border-indigo-500/30 transition-all group"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
        </div>
        <span className="hidden md:inline font-black text-xs uppercase tracking-[0.2em]">Cargar Fichas</span>
      </motion.button>

      <DepositModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
