'use client'

import { useState } from 'react'
import { requestWithdrawal } from '@/app/actions/withdrawals'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Wallet, Landmark, ShieldAlert, Banknote, ShieldCheck } from 'lucide-react'
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
    <div className="min-h-screen bg-transparent pb-32">
      <div className="max-w-lg mx-auto space-y-8 px-4">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6 mt-4"
        >
          <Link href="/wallet" className="group relative w-14 h-14 bg-black/60 backdrop-blur-xl border-2 border-brand-gold/30 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-brand-gold/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ArrowLeft className="w-7 h-7 text-brand-gold relative z-10" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-3xl font-display font-black text-brand-gold italic tracking-tighter leading-none select-none uppercase">Retirar Saldo</h1>
            <p className="text-text-secondary text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Solicita tu retiro de fondos</p>
          </div>
        </motion.div>

        {/* Withdraw Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleWithdraw} 
          className="space-y-8 bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-[3rem] border-2 border-white/5 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-brand-gold/2 opacity-[0.03] pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-2">
              <Banknote className="w-4 h-4 text-brand-gold opacity-60" />
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">Monto a Retirar</label>
            </div>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-display font-black text-brand-gold italic pr-2">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full h-20 pl-12 pr-6 bg-black/60 border-2 border-brand-gold/10 rounded-[1.5rem] text-2xl md:text-4xl font-display font-black text-text-premium placeholder:text-white/10 focus:outline-none focus:border-brand-gold/40 focus:bg-black/80 transition-all italic tracking-tight"
              />
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-3 ml-2">
              <Landmark className="w-4 h-4 text-brand-gold opacity-60" />
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">Datos Bancarios (Alias/CBU)</label>
            </div>
            <textarea
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="Ej: ALIAS: mesa.primera.user..."
              required
              className="w-full h-32 p-6 bg-black/60 border-2 border-white/5 rounded-[1.5rem] text-sm font-medium text-text-premium focus:outline-none focus:border-brand-gold/30 focus:bg-black/80 transition-all resize-none shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full h-20 bg-brand-gold text-black rounded-[1.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-[0_15px_40px_rgba(202,171,114,0.3)] hover:shadow-[0_20px_50px_rgba(202,171,114,0.5)] transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-4 overflow-hidden active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Procesando...</span>
              </div>
            ) : (
              <>
                <ShieldCheck className="w-6 h-6" />
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
          className="relative group overflow-hidden bg-brand-gold/5 backdrop-blur-2xl border-2 border-brand-gold/20 p-8 rounded-[2.5rem] shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20">
              <ShieldAlert className="w-5 h-5 text-brand-gold" />
            </div>
            <h3 className="text-sm font-display font-black text-brand-gold uppercase tracking-[0.2em] italic">Reglas del Club</h3>
          </div>
          <ul className="space-y-3">
            {[
              'Los retiros se procesan en un plazo de 1 a 12 horas.',
              'El CBU/CVU debe estar a tu nombre registrado.',
              'No se procesarán retiros a cuentas de terceros.'
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 opacity-60" />
                <span className="text-xs text-text-secondary font-medium tracking-wide opacity-80 leading-relaxed">{rule}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
