'use client'

import { useState } from 'react'
import { requestWithdrawal } from '@/app/actions/withdrawals'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Landmark, ShieldAlert, Banknote, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function WithdrawPage() {
  const [amount, setAmount] = useState('')
  const [bankDetails, setBankDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !bankDetails) return

    setLoading(true)
    try {
      const { error } = await requestWithdrawal(Number(amount), bankDetails)
      if (error) throw new Error(error)

      router.push('/wallet')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-table pb-32 pt-8">
      <div className="max-w-lg mx-auto space-y-10 px-4">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <Link href="/wallet" className="group relative w-14 h-14 md:w-16 md:h-16 bg-black/40 backdrop-blur-xl border-2 border-[#c0a060]/30 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden hover:border-[#c0a060]/60">
            <div className="absolute inset-0 bg-[#c0a060]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ArrowLeft className="w-6 h-6 md:w-8 md:h-8 text-[#c0a060] relative z-10 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="space-y-1 pt-1">
            <h1 className="text-3xl md:text-4xl font-display font-black italic text-accent-gold-shimmer leading-none tracking-tight select-none uppercase drop-shadow-premium whitespace-nowrap">
              Retirar <span className="ml-[0.1em]">Saldo</span>
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-8 bg-accent-gold/40 rounded-full" />
              <p className="text-[#f3edd7]/40 text-[9px] font-black uppercase tracking-[0.3em]">Protocolo de Élite</p>
            </div>
          </div>
        </motion.div> 

        {/* Withdraw Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleWithdraw} 
          className="relative group overflow-hidden bg-gradient-to-br from-black/40 to-black/60 border-2 border-[#c0a060]/30 p-6 md:p-8 rounded-[2rem] shadow-[0_25px_50px_rgba(0,0,0,0.5)] transition-all hover:border-[#c0a060]/60 space-y-8"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#c0a060]/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-[#c0a060]/10 transition-all duration-1000 pointer-events-none" />
          
          <div className="space-y-4 relative z-10 w-full">
            <div className="flex items-center gap-3 ml-2">
              <Banknote className="w-4 h-4 text-[#c0a060] opacity-80" />
              <label className="text-[10px] md:text-[11px] font-black text-[#c0a060] uppercase tracking-[0.3em]">Monto a Retirar (COP)</label>
            </div>
            <div className="relative group w-full">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-display font-black text-[#c0a060] italic pr-2">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
                }}
                placeholder="0"
                required
                className="w-full h-20 pl-14 pr-6 bg-black/40 border-2 border-white/5 rounded-2xl text-3xl md:text-4xl font-display font-black text-[#f3edd7] placeholder:text-white/10 focus:outline-none focus:border-[#c0a060]/40 focus:bg-black/60 transition-all italic tracking-tighter shadow-inner"
              />
            </div>
            <p className="text-[#c0a060]/40 text-[10px] font-medium ml-2">Por favor, escribe el número sin puntos ni comas</p>
          </div>

          <div className="space-y-4 relative z-10 w-full">
             <div className="flex items-center gap-3 ml-2">
              <Landmark className="w-4 h-4 text-[#c0a060] opacity-80" />
              <label className="text-[10px] md:text-[11px] font-black text-[#c0a060] uppercase tracking-[0.3em]">Datos Bancarios (Alias/CBU)</label>
            </div>
            <textarea
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="Ej: ALIAS: mesa.primera.user..."
              required
              className="w-full h-32 p-6 bg-black/40 border-2 border-white/5 rounded-2xl text-sm md:text-base font-bold text-[#f3edd7] focus:outline-none focus:border-[#c0a060]/40 focus:bg-black/60 transition-all resize-none shadow-inner placeholder:text-white/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-accent-gold-shimmer text-slate-950 rounded-xl font-display font-black uppercase italic tracking-[0.3em] text-[10px] md:text-xs shadow-[0_10px_20px_rgba(192,160,96,0.3)] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 border-2 border-[#f0d78c] hover:shadow-[0_15px_30px_rgba(192,160,96,0.4)] relative z-10"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                <span>Procesando...</span>
              </div>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Confirmar Retiro</span>
              </>
            )}
          </button>
        </motion.form>

        {/* Rules Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/40 rounded-[2rem] p-6 md:p-8 border border-[#c0a060]/10 space-y-6"
        >
          <div className="flex items-center gap-3 justify-center">
            <ShieldAlert className="w-5 h-5 text-[#c0a060] opacity-80" />
            <span className="text-[10px] md:text-[11px] font-black text-[#c0a060] uppercase tracking-[0.3em]">Protocolo de Retiro</span>
          </div>
          <ul className="space-y-3">
            {[
              'Los retiros se procesan en un plazo de 1 a 12 horas hábiles.',
              'El CBU/CVU debe coincidir con el titular de la cuenta.',
              'Por seguridad, no se realizan transferencias a terceros.'
            ].map((rule, i) => (
              <li key={i} className="flex items-center gap-3 text-left">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c0a060]/60 shrink-0" />
                <span className="text-xs text-[#f3edd7]/60 font-medium tracking-wide leading-relaxed">{rule}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
