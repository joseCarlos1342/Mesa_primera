"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'

interface ReconnectOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function ReconnectOverlay({ isVisible, message = "Intentando reconectar a la sala..." }: ReconnectOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6"
          style={{ background: 'radial-gradient(ellipse at center, #0d2e1b 0%, #050f08 100%)' }}
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

          <motion.div
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
              className="relative w-full rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #0f2a18 0%, #0a1c10 60%, #071209 100%)',
                border: '1px solid rgba(212,175,55,0.35)',
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
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative flex items-center justify-center w-20 h-20 rounded-full mb-7"
                  style={{
                    background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 70%)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    boxShadow: '0 0 24px rgba(212,175,55,0.1), inset 0 1px 0 rgba(212,175,55,0.15)',
                  }}
                >
                  <WifiOff
                    className="w-9 h-9"
                    style={{ color: '#d4af37', filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' }}
                  />
                </motion.div>

                {/* Title */}
                <h2
                  className="text-2xl font-bold tracking-widest uppercase mb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#fdf0a6',
                    textShadow: '0 0 20px rgba(212,175,55,0.25)',
                    letterSpacing: '0.12em',
                  }}
                >
                  Conexión Perdida
                </h2>

                {/* Gold ornament line */}
                <div className="flex items-center gap-2 my-4 w-full">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4))' }} />
                  <span style={{ color: '#d4af37', fontSize: '10px' }}>✦</span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }} />
                </div>

                {/* Message */}
                <p
                  className="text-sm leading-relaxed mb-8"
                  style={{ color: 'rgba(253,240,166,0.55)', fontFamily: "'Outfit', sans-serif" }}
                >
                  {message}
                </p>

                {/* Pulsing dots loader */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay, ease: 'easeInOut' }}
                        className="block w-2 h-2 rounded-full"
                        style={{ background: '#d4af37', boxShadow: '0 0 6px rgba(212,175,55,0.6)' }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-xs tracking-[0.2em] uppercase font-semibold"
                    style={{ color: 'rgba(212,175,55,0.7)', fontFamily: "'Outfit', sans-serif" }}
                  >
                    Restaurando sesión
                  </span>
                </div>

              </div>

              {/* Bottom gold divider */}
              <div className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)' }}
              />
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
