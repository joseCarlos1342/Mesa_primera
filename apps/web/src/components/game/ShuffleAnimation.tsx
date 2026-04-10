"use client"

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { m } from 'framer-motion'

const CARD_COUNT = 10
const HALF = CARD_COUNT / 2
const CARD_W = 58
const CARD_H = 82

/**
 * Full-screen overlay with a GSAP professional card shuffle animation.
 * Designed to show during the BARAJANDO phase.
 * Each shuffle cycle is ~5s; the animation loops until unmount.
 * Wrap in <AnimatePresence> for smooth fade in/out.
 */
export function ShuffleAnimation() {
  const deckRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!deckRef.current) return
    const cards = Array.from(deckRef.current.querySelectorAll<HTMLElement>('.sc'))
    if (cards.length !== CARD_COUNT) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ repeat: -1 })

    // Pad each 5-second cycle so the repeat aligns perfectly
    tl.addLabel('c1', 0)
    tl.addLabel('c2', 5)
    tl.addLabel('end', 10)

    const addCycle = (s: number) => {
      // ── RESET to stacked deck ──────────────────────────────────────────
      tl.set(cards, {
        x: 0,
        y: (i) => -i * 0.5,
        rotation: (i) => (i - HALF + 0.5) * 0.35,
        rotateX: 0,
        zIndex: (i) => i,
        clearProps: 'filter',
      }, s)

      // ── SPLIT into two piles ───────────────────────────────────────── 0→0.72s
      cards.forEach((card, i) => {
        const isLeft = i < HALF
        const stackIdx = i % HALF
        tl.to(card, {
          x: isLeft ? -82 : 82,
          y: -stackIdx * 1.15,
          rotation: isLeft ? -9 : 9,
          duration: 0.68,
          ease: 'power2.inOut',
        }, s + i * 0.04)
      })

      // ── RIFFLE interleave ──────────────────────────────────────────── 0.72→1.82s
      // left[0], right[0], left[1], right[1] …
      for (let k = 0; k < HALF; k++) {
        tl.to(cards[k], {            // left pile card k
          x: 0, y: -(k * 2) * 1.25, rotation: 0,
          duration: 0.13, ease: 'power1.out',
        }, s + 0.72 + (k * 2) * 0.105)

        tl.to(cards[HALF + k], {    // right pile card k
          x: 0, y: -(k * 2 + 1) * 1.25, rotation: 0,
          duration: 0.13, ease: 'power1.out',
        }, s + 0.72 + (k * 2 + 1) * 0.105)
      }

      // ── BRIDGE arch ────────────────────────────────────────────────── 2.0→2.55s
      cards.forEach((card, i) => {
        // j = position in the interleaved (post-riffle) stack (0 = bottom)
        const j = i < HALF ? i * 2 : (i - HALF) * 2 + 1
        const arch = -30 * Math.sin((j / (CARD_COUNT - 1)) * Math.PI)
        tl.to(card, {
          y: -j * 1.25 + arch,
          rotateX: 24 * Math.sin((j / (CARD_COUNT - 1)) * Math.PI),
          duration: 0.44,
          ease: 'power1.inOut',
        }, s + 2.0 + j * 0.011)
      })

      // ── BRIDGE collapse ────────────────────────────────────────────── 2.5→3.1s
      cards.forEach((card, i) => {
        const j = i < HALF ? i * 2 : (i - HALF) * 2 + 1
        tl.to(card, {
          y: -j * 0.7,
          rotateX: 0,
          duration: 0.44,
          ease: 'bounce.out',
        }, s + 2.5 + j * 0.009)
      })

      // ── SQUARE UP ──────────────────────────────────────────────────── 3.2→3.7s
      tl.to(cards, {
        x: 0,
        y: (i) => -i * 0.5,
        rotation: (i) => (i - HALF + 0.5) * 0.35,
        duration: 0.38,
        ease: 'power2.out',
        stagger: 0.018,
      }, s + 3.2)
      // Pause until s + 5.0 (natural settle — GSAP label above ensures padding)
    }

    addCycle(0)
    addCycle(5)
    }) // end prefers-reduced-motion: no-preference
  }, { scope: deckRef })

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-[#040810]/82 backdrop-blur-[3px]"
    >
      {/* ── Banner ── */}
      <m.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.55 }}
        className="mb-14 text-center select-none"
      >
        <p className="text-[8px] md:text-[10px] text-[#d4af37]/55 uppercase tracking-[0.5em] font-bold mb-2">
          Preparando la partida
        </p>
        <h2 className="text-2xl md:text-4xl font-serif font-black italic uppercase tracking-[0.2em] text-[#fdf0a6] drop-shadow-[0_0_28px_rgba(212,175,55,0.55)]">
          Barajando
          <m.span
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          >
            {' ...'}
          </m.span>
        </h2>
      </m.div>

      {/* ── Card deck visual ── */}
      <div className="relative flex items-center justify-center" style={{ perspective: '900px' }}>
        {/* Felt shadow beneath the deck */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-28 h-3 rounded-full bg-black/50 blur-lg pointer-events-none" />

        <div
          ref={deckRef}
          className="relative"
          style={{ width: CARD_W, height: CARD_H }}
        >
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <div
              key={i}
              className="sc absolute"
              style={{
                width: CARD_W,
                height: CARD_H,
                left: 0,
                top: 0,
                borderRadius: 7,
                background: '#0c1220',
                border: '1.5px solid rgba(212,175,55,0.52)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.03)',
                backgroundImage: [
                  'repeating-linear-gradient(45deg,  rgba(212,175,55,0.045) 0px, rgba(212,175,55,0.045) 1.5px, transparent 1.5px, transparent 9px)',
                  'repeating-linear-gradient(-45deg, rgba(212,175,55,0.045) 0px, rgba(212,175,55,0.045) 1.5px, transparent 1.5px, transparent 9px)',
                ].join(', '),
              }}
            >
              {/* Inner decorative border */}
              <div style={{
                position: 'absolute', inset: 4,
                border: '1px solid rgba(212,175,55,0.17)',
                borderRadius: 3,
              }} />
              {/* Center pip */}
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10,
                borderRadius: '50%',
                background: 'rgba(212,175,55,0.12)',
              }} />
            </div>
          ))}
        </div>
      </div>
    </m.div>
  )
}
