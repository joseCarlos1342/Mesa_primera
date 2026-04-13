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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_#0a2a1f_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
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
        <div className="backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-6 md:p-10 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
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
