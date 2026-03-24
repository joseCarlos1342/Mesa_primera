'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { Upload, Landmark, MessageSquare, Image as ImageIcon, Copy, Check, ShieldCheck, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DepositFormProps {
  initialAmount?: string
  onSuccess?: () => void
}

export function DepositForm({ initialAmount = '', onSuccess }: DepositFormProps) {
  const [amount, setAmount] = useState(initialAmount)
  const [observations, setObservations] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (initialAmount) setAmount(initialAmount)
  }, [initialAmount])

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
      if (!user) throw new Error('Usuario no autenticado')

      const filePath = `${user.id}/${Date.now()}_${file.name}`
      const { data, error: storageError } = await supabase.storage
        .from('deposits')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { error: dbError } = await createDepositRequest(Number(amount), data.path, observations)
      if (dbError) throw new Error(dbError)

      if (onSuccess) {
        onSuccess()
      } else {
        alert('Solicitud enviada correctamente. Se acreditará pronto.')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 py-2">
      {/* Bank Details Card - Premium VIP Design */}
      <div className="relative group overflow-hidden bg-gradient-to-br from-black/40 to-black/60 border-2 border-[#c0a060]/30 p-6 md:p-8 rounded-[2rem] shadow-[0_25px_50px_rgba(0,0,0,0.5)] transition-all hover:border-[#c0a060]/60">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c0a060]/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-[#c0a060]/10 transition-all duration-1000 pointer-events-none" />
        
        <div className="flex flex-col gap-6 md:gap-8 relative z-10 w-full">
          <div className="space-y-4 md:space-y-6 text-center w-full">
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#c0a060]/20 to-[#8b6b2e]/10 rounded-xl flex items-center justify-center border-2 border-[#c0a060]/30 shadow-[0_0_20px_rgba(192,160,96,0.1)]">
                <Landmark className="w-6 h-6 text-[#c0a060]" />
              </div>
              <div className="text-left">
                <span className="text-[#c0a060]/60 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] block drop-shadow-sm leading-none mb-1">Cuenta de Transferencia</span>
                <span className="text-[#f3edd7] text-base md:text-lg font-bold tracking-tight">Nequi Personal</span>
              </div>
            </div>
            
            <div className="inline-block relative">
              <span className="font-display text-4xl md:text-5xl font-black text-[#f3edd7] tracking-[0.05em] italic drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] select-all px-2 whitespace-nowrap">
                3125822841
              </span>
              <div className="absolute -bottom-2 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#c0a060]/40 to-transparent blur-[1px]" />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
            <button 
              type="button"
              onClick={copyToClipboard}
              className={`w-full sm:w-auto lg:w-56 px-6 h-14 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border-2 active:scale-95 shadow-xl ${
                copied 
                  ? 'bg-accent-gold-shimmer text-slate-950 border-[#f0d78c] shadow-accent-gold/40' 
                  : 'bg-brand-gold/5 text-[#c0a060] border-[#c0a060]/20 hover:bg-brand-gold/10 hover:border-[#c0a060]/60 hover:shadow-accent-gold/10'
              }`}
            >
              {copied ? <Check className="w-5 h-5 mx-1" /> : <Copy className="w-5 h-5 mx-1" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Número'}</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleUpload} className="space-y-8">
        {/* Amount Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 ml-6">
            <div className="w-2 h-2 rounded-full bg-[#c0a060] shadow-[0_0_12px_rgba(192,160,96,0.8)] animate-pulse" />
            <label className="text-xs font-black text-[#f3edd7]/60 uppercase tracking-[0.4em] drop-shadow-sm">Monto a Cargar ($)</label>
          </div>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <span className="text-3xl font-display font-black text-[#c0a060] italic pr-2 opacity-60">$</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full h-16 md:h-20 pl-14 md:pl-16 pr-6 bg-black/40 border-2 border-brand-gold/10 rounded-2xl md:rounded-[2rem] text-3xl md:text-4xl font-display font-black text-[#f3edd7] placeholder:text-brand-gold/10 focus:outline-none focus:border-[#c0a060]/60 focus:bg-black/60 transition-all italic tracking-tight shadow-[inset_0_4px_15px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 ml-6">
            <div className="w-2 h-2 rounded-full bg-[#c0a060] shadow-[0_0_12px_rgba(192,160,96,0.8)]" />
            <label className="text-xs font-black text-[#f3edd7]/60 uppercase tracking-[0.4em]">Subir Comprobante de Pago</label>
          </div>
          <div className="relative group min-h-[220px] md:min-h-[280px] border-2 border-dashed border-[#c0a060]/20 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center hover:border-[#c0a060]/50 transition-all cursor-pointer overflow-hidden bg-black/30 shadow-[inset_0_4px_20px_rgba(0,0,0,0.4)]">
            <AnimatePresence mode="wait">
              {previewUrl ? (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative w-full h-full min-h-[220px] md:min-h-[280px]"
                >
                  <img 
                    src={previewUrl} 
                    className="w-full h-full object-contain p-4" 
                    alt="Vista previa" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-8">
                    <p className="text-[#f3edd7] text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] bg-[#c0a060]/20 backdrop-blur-md px-6 py-2.5 rounded-xl border-2 border-[#c0a060]/30 shadow-xl">Reemplazar Comprobante</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="upload-prompt"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4 md:space-y-6 p-8"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-[#c0a060]/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-[#c0a060]/20 shadow-2xl group-hover:scale-110 group-hover:bg-[#c0a060]/20 transition-all duration-700">
                    <Upload className="h-8 w-8 md:h-10 md:w-10 text-[#c0a060] drop-shadow-[0_0_10px_rgba(192,160,96,0.5)]" />
                  </div>
                  <div className="px-2">
                    <p className="text-[#f3edd7] text-base md:text-lg font-black uppercase tracking-[0.2em] leading-tight">Presiona para subir</p>
                    <p className="text-[#f3edd7]/40 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">PNG, JPG o Captura de pantalla</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              required={!previewUrl}
            />
          </div>
        </div>

        {/* Observations Section */}
        <div className="space-y-6">
           <div className="flex items-center gap-4 ml-6">
            <div className="w-2 h-2 rounded-full bg-[#c0a060]/30" />
            <label className="text-xs font-black text-[#f3edd7]/40 uppercase tracking-[0.4em]">Notas adicionales (Opcional)</label>
          </div>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Escribe aquí cualquier observación..."
            className="w-full h-24 md:h-28 p-6 md:p-8 bg-black/30 border-2 border-brand-gold/5 rounded-2xl md:rounded-[2rem] text-sm md:text-base font-medium text-[#f3edd7] focus:outline-none focus:border-[#c0a060]/40 focus:bg-black/50 transition-all resize-none shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)] placeholder:text-[#f3edd7]/10"
          />
        </div>

        {/* Submit Section */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full h-16 md:h-20 bg-accent-gold-shimmer text-slate-950 rounded-2xl md:rounded-[1.8rem] font-black uppercase tracking-[0.3em] text-sm md:text-base shadow-[0_20px_50px_rgba(192,160,96,0.3)] hover:shadow-[#c0a060]/60 transition-all duration-700 disabled:opacity-50 flex items-center justify-center gap-4 overflow-hidden active:scale-[0.98] border-b-4 border-black/30 active:border-b-0 active:translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[250%] group-hover:translate-x-[250%] transition-transform duration-1200 ease-in-out opacity-30 pointer-events-none" />
            {loading ? (
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                <span className="tracking-[0.1em]">Procesando Saldo...</span>
              </div>
            ) : (
              <>
                <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
                <span>Confirmar Depósito</span>
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-3 mt-8 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c0a060]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#f3edd7]">Transacción Enmascarada y Segura</p>
            <div className="w-1.5 h-1.5 rounded-full bg-[#c0a060]" />
          </div>
        </div>
      </form>
    </div>
  )
}
