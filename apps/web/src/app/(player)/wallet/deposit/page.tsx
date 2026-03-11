import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function DepositPage() {
  const searchParams = useSearchParams()
  const initialAmount = searchParams.get('amount') || ''
  const [amount, setAmount] = useState(initialAmount)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (initialAmount) setAmount(initialAmount)
  }, [initialAmount])

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
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-32">
      <div className="max-w-md mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/wallet" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-black italic text-indigo-400 uppercase tracking-tighter">Cargar Fichas</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Paso Final: Sube tu comprobante</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-6 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 shadow-xl">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Monto a confirmar</label>
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
            <div className="relative h-48 border-2 border-dashed border-slate-700 rounded-[2rem] flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden bg-black/20 group">
              {file ? (
                <div className="text-center p-4">
                  <p className="text-indigo-400 font-black text-xs break-all">{file.name}</p>
                  <p className="text-slate-600 text-[8px] uppercase tracking-widest mt-1">Archivo seleccionado</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Seleccionar Foto</p>
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

        <div className="p-6 bg-indigo-600/10 rounded-[2rem] border border-indigo-500/20 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-4 h-4 text-indigo-400" />
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Información de Transferencia</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">ALIAS:</span>
              <span className="font-black text-indigo-200 uppercase">mesa.primera.v2</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">BANCO:</span>
              <span className="font-black text-indigo-200 uppercase">Mercado Pago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
