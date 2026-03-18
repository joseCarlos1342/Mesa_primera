"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, DollarSign, Landmark, MessageSquare, Image as ImageIcon, Copy, Check } from 'lucide-react'
import Link from 'next/link'

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

      alert('Solicitud enviada correctamente. Se acreditará pronto.')
      router.push('/wallet')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-32">
      <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center gap-4">
          <Link href="/wallet" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg shadow-black/40">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-black italic text-indigo-400 uppercase tracking-tighter">CARGAR PESOS (COP)</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Paso Final: Sube tu comprobante</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-6 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Monto a confirmar (COP)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full h-16 pl-12 pr-4 bg-black/40 border border-slate-700 rounded-2xl text-3xl font-black text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tu comprobante (Imagen)</label>
            <div className="relative group h-48 border-2 border-dashed border-slate-700 rounded-[2rem] flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden bg-black/20">
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" alt="Vista previa" />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Seleccionar Foto</p>
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

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Observaciones (Opcional)</label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ej: Depósito por Nequi, etc."
                className="w-full h-24 pl-12 pr-4 pt-3 bg-black/40 border border-slate-700 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-3 border-b-4 border-indigo-900"
          >
            {loading ? 'Procesando...' : (
              <>
                <Upload className="w-5 h-5" />
                Confirmar Pago
              </>
            )}
          </button>
        </form>

        <div className="mx-0 p-6 bg-indigo-600/10 rounded-[2rem] border border-indigo-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block">Número de Transferencia:</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-indigo-300 tracking-wider">3125822841</span>
          </div>
          <button 
            type="button"
            onClick={copyToClipboard}
            className={`p-3 sm:p-4 rounded-2xl transition-all flex items-center gap-2 ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40'}`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
