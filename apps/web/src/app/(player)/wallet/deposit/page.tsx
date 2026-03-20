"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, Landmark, MessageSquare, Image as ImageIcon, Copy, Check, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function DepositPage() {
  const searchParams = useSearchParams()
  const initialAmount = searchParams.get('amount') || ''
  const [amount, setAmount] = useState(initialAmount)
  const [observations, setObservations] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
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
      if (!user) throw new Error('No user')

      const filePath = `${user.id}/${Date.now()}_${file.name}`
      const { data, error: storageError } = await supabase.storage
        .from('deposits')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { error: dbError } = await createDepositRequest(Number(amount), data.path, observations)
      if (dbError) throw new Error(dbError)

      router.push('/wallet')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent pb-32">
      <div className="max-w-lg mx-auto space-y-10 px-4">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6 mt-10 md:mt-12"
        >
          <Link href="/wallet" className="group relative w-14 h-14 bg-black/60 backdrop-blur-xl border-2 border-brand-gold/30 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-brand-gold/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ArrowLeft className="w-7 h-7 text-brand-gold relative z-10" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-black text-brand-gold italic tracking-tighter leading-none select-none uppercase">Cargar Saldo</h1>
            <p className="text-text-secondary text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Sube tu comprobante de pago</p>
          </div>
        </motion.div>

        {/* Bank Details Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative group overflow-hidden bg-black/60 backdrop-blur-2xl border-2 border-brand-gold/20 p-8 rounded-[2.5rem] shadow-2xl transition-all hover:border-brand-gold/40"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-gold/10 transition-all" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 sm:space-y-1 text-center sm:text-left">
              <span className="text-text-secondary text-[10px] font-black uppercase tracking-[0.3em] block opacity-60">Cuenta de Transferencia</span>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20 shadow-lg">
                  <Landmark className="w-6 h-6 text-brand-gold" />
                </div>
                <span className="font-display text-3xl font-black text-text-premium tracking-wider italic">3125822841</span>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={copyToClipboard}
              className={`w-full sm:w-auto h-16 px-8 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border-2 active:scale-95 ${
                copied 
                  ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_30px_rgba(202,171,114,0.4)]' 
                  : 'bg-white/5 text-brand-gold border-brand-gold/20 hover:bg-white/10 hover:border-brand-gold/40'
              }`}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </motion.div>

        {/* Deposit Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleUpload} 
          className="space-y-8 bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-[3rem] border-2 border-white/5 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-brand-gold/2 opacity-[0.03] pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-2">
              <ShieldCheck className="w-4 h-4 text-brand-gold opacity-60" />
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">Monto del Depósito</label>
            </div>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-display font-black text-brand-gold italic pr-2">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full h-20 pl-12 pr-6 bg-black/60 border-2 border-brand-gold/10 rounded-[1.5rem] text-4xl font-display font-black text-text-premium placeholder:text-white/10 focus:outline-none focus:border-brand-gold/40 focus:bg-black/80 transition-all italic tracking-tight"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-2">
              <ImageIcon className="w-4 h-4 text-brand-gold opacity-60" />
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">Comprobante de Pago</label>
            </div>
            <div className="relative group h-64 border-2 border-dashed border-brand-gold/20 rounded-[2.5rem] flex flex-col items-center justify-center hover:border-brand-gold/50 transition-all cursor-pointer overflow-hidden bg-black/40 shadow-inner group">
              <AnimatePresence mode="wait">
                {previewUrl ? (
                  <motion.img 
                    key="preview"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    src={previewUrl} 
                    className="w-full h-full object-cover" 
                    alt="Vista previa" 
                  />
                ) : (
                  <motion.div 
                    key="upload-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-4 p-8"
                  >
                    <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto border border-brand-gold/20 shadow-lg group-hover:scale-110 transition-transform duration-500">
                      <Upload className="h-7 w-7 text-brand-gold" />
                    </div>
                    <div>
                      <p className="text-text-premium text-sm font-black uppercase tracking-widest leading-tight">Seleccionar Imagen</p>
                      <p className="text-text-secondary text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mt-2">JPG, PNG o Screenshot</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                required
              />
              <div className="absolute inset-0 bg-brand-gold/5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-3 ml-2">
              <MessageSquare className="w-4 h-4 text-brand-gold opacity-60" />
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">Notas del Personal (Opcional)</label>
            </div>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ej: Transferencia desde mi Nequi..."
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
                <span>Confirmar Pago</span>
              </>
            )}
          </button>
        </motion.form>
      </div>
    </div>
  )
}
