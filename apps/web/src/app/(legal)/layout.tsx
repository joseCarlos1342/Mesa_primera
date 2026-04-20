import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-x-clip">
      {/* Premium Casino Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-bg-poker)_0%,#0a2a1f_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] noise-texture" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl px-4 md:px-8 pt-6 pb-16">
        {/* Brand header */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-block font-display font-bold text-lg tracking-[0.15em] text-brand-gold hover:text-brand-gold-light transition-colors"
          >
            4 ASES
          </Link>
        </div>

        {/* Glassmorphic Card */}
        <div className="backdrop-blur-2xl bg-black/40 border border-brand-gold/15 p-5 md:p-10 rounded-2xl md:rounded-4xl shadow-[0_40px_80px_rgba(0,0,0,0.7)] overflow-hidden [overflow-wrap:anywhere]">
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
