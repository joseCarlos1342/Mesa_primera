'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { X, Upload, DollarSign, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
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

      alert('Solicitud enviada correctamente. Se acreditará pronto.')
      onClose()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="text-xl font-black italic text-indigo-400">CARGAR FICHAS</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Monto a Acreditar</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-14 pl-12 pr-4 bg-black/40 border border-slate-700 rounded-2xl text-2xl font-black text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Comprobante (Imagen)</label>
              <div className="relative group h-32 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden bg-black/20">
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-indigo-400" />
                    <p className="text-indigo-400 font-bold text-xs truncate max-w-[200px]">{file.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Click para subir</p>
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
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2"
            >
              {loading ? 'Subiendo...' : (
                <>
                  <Upload className="w-4 h-4" />
                  Enviar Solicitud
                </>
              )}
            </button>
          </form>

          <div className="mx-6 mb-6 p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 space-y-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-black uppercase tracking-widest">ALIAS:</span>
              <span className="font-bold text-indigo-300">mesa.primera.v2</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-black uppercase tracking-widest">BANCO:</span>
              <span className="font-bold text-indigo-300">Mercado Pago</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
