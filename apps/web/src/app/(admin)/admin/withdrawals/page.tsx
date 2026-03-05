import { getPendingWithdrawals } from '@/app/actions/withdrawals'
import { processTransaction } from '@/app/actions/admin-wallet'
import Link from 'next/link'

export default async function AdminWithdrawalsPage() {
  const result = await getPendingWithdrawals()

  if (result.error) {
    return <div className="p-8 text-red-500">Error: {result.error}</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">RETIROS PENDIENTES</h1>
            <p className="text-slate-500 text-sm uppercase tracking-widest font-bold">Validación de Egresos</p>
          </div>
          <div className="flex gap-4">
            <Link href="/admin" className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest bg-slate-800 px-4 py-2 rounded-xl transition-all">Regresar</Link>
          </div>
        </header>

        <div className="space-y-4">
          {result.withdrawals?.length === 0 ? (
            <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-20 text-center space-y-2">
              <p className="text-slate-600 font-bold italic">No hay solicitudes de retiro pendientes</p>
              <div className="inline-block px-3 py-1 bg-emerald-500/5 text-emerald-500 text-[10px] font-black tracking-widest uppercase rounded-full border border-emerald-500/10">Cola vacía</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {result.withdrawals?.map((wit: any) => (
                <div key={wit.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center justify-between group hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-400">
                      {wit.wallets.profiles.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-white underline decoration-slate-700 underline-offset-4">{wit.wallets.profiles.username}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">Solicitó: {new Date(wit.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="text-right space-y-1">
                      <p className="text-2xl font-black text-rose-400 tabular-nums">${Math.abs(wit.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Monto a Enviar</p>
                    </div>

                    <div className="flex gap-2">
                      <form action={async () => {
                        'use server'
                        await processTransaction(wit.id, 'completed')
                      }}>
                        <button type="submit" className="h-10 px-6 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/10">Procesar</button>
                      </form>
                      
                      <form action={async () => {
                        'use server'
                        await processTransaction(wit.id, 'failed')
                      }}>
                        <button type="submit" className="h-10 px-6 bg-rose-600/10 border border-rose-600/30 text-rose-500 hover:bg-rose-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">Anular</button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
