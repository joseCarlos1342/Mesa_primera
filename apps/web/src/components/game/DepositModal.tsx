'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { X, Upload, DollarSign, Image as ImageIcon, Copy, Check, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState('')
  const [observations, setObservations] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText('3125822841')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

      // Use the path returned by Supabase
      const { error: dbError } = await createDepositRequest(Number(amount), data.path, observations)
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl landscape:max-h-[95vh] landscape:flex landscape:flex-col"
        >
          <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 landscape:py-3">
            <h2 className="text-lg md:text-xl font-black italic text-indigo-400">CARGAR PESOS (COP)</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar landscape:max-h-none flex-1">
            <form onSubmit={handleUpload} className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Monto (COP)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full h-12 md:h-14 pl-12 pr-4 bg-black/40 border border-slate-700 rounded-2xl text-xl md:text-2xl font-black text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 landscape:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Comprobante (Imagen)</label>
                  <div className="relative group h-28 md:h-32 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden bg-black/20">
                    {previewUrl ? (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Vista previa" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 md:h-6 md:w-6 text-slate-600 mb-1" />
                        <p className="text-slate-600 text-[8px] md:text-[9px] font-black uppercase tracking-widest">Subir Imagen</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Observaciones (Opcional)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-3 w-4 h-4 text-slate-600" />
                    <textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Nequi, etc."
                      className="w-full h-28 md:h-24 pl-12 pr-4 pt-3 bg-black/40 border border-slate-700 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all resize-none landscape:h-28"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 md:h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2"
              >
                {loading ? 'Subiendo...' : (
                  <>
                    <Upload className="w-4 h-4" />
                    Enviar Solicitud
                  </>
                )}
              </button>
            </form>

            <div className="mx-4 md:mx-6 mb-4 md:mb-6 p-3 md:p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest block">Transferencia:</span>
                <span className="font-mono text-lg md:text-xl font-black text-indigo-300 tracking-wider">3125822841</span>
              </div>
              <button 
                type="button"
                onClick={copyToClipboard}
                className={`p-2 md:p-3 rounded-xl transition-all flex items-center gap-2 ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40'}`}
              >
                {copied ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
