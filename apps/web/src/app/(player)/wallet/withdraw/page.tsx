'use client'

import { useState } from 'react'
import { requestWithdrawal } from '@/app/actions/withdrawals'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black italic text-purple-400">RETIRAR SALDO</h1>
          <p className="text-slate-500 text-sm">Completa los datos para tu retiro</p>
        </div>

        <form onSubmit={handleWithdraw} className="space-y-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Monto a Retirar</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full h-14 px-4 bg-black/40 border border-slate-700 rounded-2xl text-2xl font-black text-white focus:outline-none focus:border-purple-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Datos Bancarios (Alias/CBU)</label>
            <textarea
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="Ej: ALIAS: mesa.primera.user"
              required
              className="w-full h-24 p-4 bg-black/40 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-purple-600/20 uppercase tracking-widest text-sm"
          >
            {loading ? 'Procesando...' : 'Confirmar Retiro'}
          </button>
        </form>

        <div className="p-4 bg-purple-600/5 rounded-2xl border border-purple-500/10 space-y-2">
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Información de Seguridad</p>
          <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
            <li>Los retiros se procesan en un plazo de 1 a 12 horas.</li>
            <li>El CBU/CVU debe estar a tu nombre.</li>
            <li>No se procesarán retiros a cuentas de terceros.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
