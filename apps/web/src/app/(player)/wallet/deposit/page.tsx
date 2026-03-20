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
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-8 mt-12 md:mt-16"
        >
          <Link href="/wallet" className="group relative w-16 h-16 bg-slate-900 border-2 border-accent-gold/30 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-accent-gold/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ArrowLeft className="w-8 h-8 text-accent-gold relative z-10" />
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-display font-black text-accent-gold italic tracking-[0.1em] select-none uppercase drop-shadow-sm">
              Cargar <span className="ml-[0.2em]">Saldo</span>
            </h1>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] opacity-60 ml-1">Sube tu comprobante de pago</p>
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
