'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { useRouter } from 'next/navigation'

export default function DepositPage() {
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !amount) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const filePath = `${user.id}/${Date.now()}_${file.name}`
      const { data, error: storageError } = await supabase.storage
        .from('deposits')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { error: dbError } = await createDepositRequest(Number(amount), data.path)
      if (dbError) throw new Error(dbError)

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
          <h1 className="text-3xl font-black italic text-indigo-400">CARGAR FICHAS</h1>
          <p className="text-slate-500 text-sm">Sube tu comprobante de transferencia</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Monto a Acreditar</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full h-14 px-4 bg-black/40 border border-slate-700 rounded-2xl text-2xl font-black text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Comprobante (Imagen)</label>
            <div className="relative group h-32 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden">
              {file ? (
                <p className="text-indigo-400 font-bold">{file.name}</p>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-600 text-xs font-medium">Click para seleccionar archivo</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest text-sm"
          >
            {loading ? 'Subiendo...' : 'Enviar Solicitud'}
          </button>
        </form>

        <div className="p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/10 space-y-2">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Información de Pago</p>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">ALIAS:</span>
            <span className="font-bold text-slate-300">mesa.primera.v2</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">BANCO:</span>
            <span className="font-bold text-slate-300">Mercado Pago</span>
          </div>
        </div>
      </div>
    </div>
  )
}
