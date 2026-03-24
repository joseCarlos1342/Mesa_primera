"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, Landmark, MessageSquare, Image as ImageIcon, Copy, Check, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

import { DepositForm } from '@/components/game/DepositForm'

export default function DepositPage() {
  const searchParams = useSearchParams()
  const initialAmount = searchParams.get('amount') || ''
  const router = useRouter()

  return (
    <div className="min-h-screen bg-transparent pb-32">
      <div className="max-w-lg mx-auto space-y-10 px-4">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2 mt-12 md:mt-16 text-center"
        >
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-brand-gold italic tracking-[0.1em] select-none uppercase drop-shadow-sm whitespace-nowrap">
              Cargar Saldo
            </h1>
            <p className="text-text-secondary text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] opacity-60">Sube tu comprobante de pago</p>
          </div>
        </motion.div>

        <DepositForm 
          initialAmount={initialAmount} 
          onSuccess={() => {
            alert('Solicitud enviada correctamente. Se acreditará pronto.')
            router.push('/wallet')
          }} 
        />
      </div>
    </div>
  )
}
