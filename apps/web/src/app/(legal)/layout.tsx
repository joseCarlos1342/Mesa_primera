import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 md:p-8 bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-x-hidden">
      {/* Premium Casino Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-bg-poker)_0%,#0a2a1f_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] noise-texture" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl pt-4 pb-16">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        {/* Glassmorphic Card */}
        <div className="backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-6 md:p-10 rounded-4xl shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-text-secondary/40 text-xs mt-8 font-mono">
          &copy; {new Date().getFullYear()} Primera Riverada los 4 Ases. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
