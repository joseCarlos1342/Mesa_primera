"use client"

import { m, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'

interface ReconnectOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function ReconnectOverlay({ isVisible, message = "Intentando reconectar a la sala..." }: ReconnectOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-surface-felt p-6"
        >
          {/* Felt texture overlay */}
          <div
            className="absolute inset-0 opacity-30 mix-blend-multiply pointer-events-none"
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}
          />

          {/* Ambient gold glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)' }}
          />

          <m.div
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col items-center max-w-xs w-full text-center"
          >
            {/* Outer decorative ring */}
            <div className="absolute -inset-6 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)' }}
            />

            {/* Card-shaped panel */}
            <div
              className="relative w-full overflow-hidden rounded-card border border-border-gold bg-surface-card"
              style={{
                boxShadow: '0 0 0 1px rgba(212,175,55,0.08), 0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.12)',
              }}
            >
              {/* Top gold divider shimmer */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)' }}
              />

              {/* Inner felt texture */}
              <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}
              />

              <div className="relative z-10 flex flex-col items-center px-8 py-10">

                {/* Icon ring */}
                <m.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-primary-muted/30 bg-primary/10"
                  style={{
                    boxShadow: '0 0 24px rgba(212,175,55,0.1), inset 0 1px 0 rgba(212,175,55,0.15)',
                  }}
                >
                  <WifiOff
                    className="h-9 w-9 text-primary"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' }}
                  />
                </m.div>

                {/* Title */}
                <h2
                  className="mb-1 font-display text-headline-md font-bold uppercase tracking-widest text-text-primary"
                  style={{
                    textShadow: '0 0 20px rgba(212,175,55,0.25)',
                    letterSpacing: '0.12em',
                  }}
                >
                  Conexión Perdida
                </h2>

                {/* Gold ornament line */}
                <div className="flex items-center gap-2 my-4 w-full">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4))' }} />
                  <span className="text-label-sm text-primary">✦</span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }} />
                </div>

                {/* Message */}
                <p
                  className="mb-8 font-body-md text-body-sm leading-relaxed text-text-secondary"
                >
                  {message}
                </p>

                {/* Pulsing dots loader */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <m.span
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay, ease: 'easeInOut' }}
                          className="block h-2 w-2 rounded-full bg-primary"
                          style={{ boxShadow: '0 0 6px rgba(212,175,55,0.6)' }}
                      />
                    ))}
                  </div>
                  <span
                    className="font-label-md text-label-md font-semibold uppercase tracking-[0.2em] text-primary-muted"
                  >
                    Restaurando sesión
                  </span>
                </div>

              </div>

              {/* Bottom gold divider */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-border-gold/30" />
            </div>

            {/* Corner ornaments */}
            {[
              'top-0 left-0',
              'top-0 right-0 rotate-90',
              'bottom-0 right-0 rotate-180',
              'bottom-0 left-0 -rotate-90',
            ].map((pos, i) => (
              <svg
                key={i}
                className={`absolute ${pos} w-5 h-5 opacity-40`}
                viewBox="0 0 20 20" fill="none"
              >
                <path d="M2 2 L2 8 M2 2 L8 2" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ))}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
