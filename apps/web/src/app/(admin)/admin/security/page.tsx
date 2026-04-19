import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { getAdminSecuritySnapshot } from '@/app/actions/admin-security'
import { AdminSecurityPanel } from './AdminSecurityPanel'

export default async function AdminSecurityPage() {
  const snapshot = await getAdminSecuritySnapshot()

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Seguridad administrativa
            </div>
            <h1 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
              Blindaje de acceso
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Gestiona cambio de correo, recuperación de contraseña, rotación de TOTP y revocación de sesiones sin salir del flujo endurecido del panel.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Estado actual</p>
              <p className="mt-1 font-semibold text-white">
                {snapshot.hasTotpFactor ? 'TOTP verificado' : 'TOTP pendiente'} · {snapshot.currentAal?.toUpperCase() ?? 'AAL1'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AdminSecurityPanel snapshot={snapshot} />
    </div>
  )
}