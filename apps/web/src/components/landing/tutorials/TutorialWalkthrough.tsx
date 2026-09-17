'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import gsap from 'gsap'
import { X } from 'lucide-react'
import { MockPhoneFrame } from './MockPhoneFrame'
import { TutorialPlayer } from './TutorialPlayer'

export interface TutorialStep {
  label: string
  screen: React.ReactNode
  landscape?: boolean
}

export interface TutorialVideoAsset {
  src: string
  poster: string
  title: string
  captions: string
}

interface TutorialWalkthroughProps {
  steps: TutorialStep[]
  className?: string
  onClose?: () => void
  dialog?: boolean
  video?: TutorialVideoAsset
}

export function TutorialWalkthrough({ steps, className = '', onClose, dialog = true, video }: TutorialWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const screenRef = useRef<HTMLDivElement>(null)
  const isAnimating = useRef(false)
  const transitionTimelineRef = useRef<gsap.core.Timeline | null>(null)

  const isLandscape = steps[currentStep]?.landscape ?? false

  const animateTransition = useCallback(
    (nextStep: number, direction: 'next' | 'prev') => {
      if (isAnimating.current || !screenRef.current) return
      if (nextStep < 0 || nextStep >= steps.length) return

      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setCurrentStep(nextStep)
        return
      }

      isAnimating.current = true
      const isForward = direction === 'next'

      const tl = gsap.timeline({
        onComplete: () => {
          isAnimating.current = false
        },
      })
      transitionTimelineRef.current = tl

      tl.to(screenRef.current, {
        opacity: 0,
        rotateY: isForward ? -90 : 90,
        duration: 0.2,
        ease: 'power2.in',
        transformOrigin: isForward ? 'left center' : 'right center',
      })

      tl.call(() => {
        setCurrentStep(nextStep)
      }, [], 0.2)

      tl.set(screenRef.current, {
        rotateY: isForward ? 90 : -90,
        opacity: 0,
      })

      tl.to(screenRef.current, {
        rotateY: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        transformOrigin: isForward ? 'left center' : 'right center',
      })
    },
    [steps.length],
  )

  const handleStepChange = useCallback(
    (nextStep: number) => {
      const direction = nextStep > currentStep ? 'next' : 'prev'
      animateTransition(nextStep, direction)
    },
    [currentStep, animateTransition],
  )

  useEffect(() => {
    if (screenRef.current && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(
        screenRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      )
    }
  }, [])

  useEffect(() => () => {
    const timeline = transitionTimelineRef.current
    if (timeline && typeof timeline.kill === 'function') timeline.kill()
    transitionTimelineRef.current = null
  }, [])

  if (steps.length === 0) {
    return (
      <div role={dialog ? 'dialog' : 'region'} aria-modal={dialog ? 'true' : undefined} aria-labelledby={dialog ? 'tutorial-walkthrough-title' : undefined} className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        {dialog && <h2 id="tutorial-walkthrough-title" className="sr-only">Tutorial interactivo</h2>}
        <p className="text-center text-text-secondary">Este tutorial no tiene pasos disponibles.</p>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg bg-brand-gold px-5 py-2.5 font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light">
            Volver a tutoriales
          </button>
        )}
      </div>
    )
  }

  return (
      <div role={dialog ? 'dialog' : 'region'} aria-modal={dialog ? 'true' : undefined} aria-labelledby={dialog ? 'tutorial-walkthrough-title' : undefined} className={`flex flex-col items-center justify-center gap-4 md:gap-6 ${className}`}>
        {dialog && <h2 id="tutorial-walkthrough-title" className="sr-only">Tutorial interactivo</h2>}
        {video && (
          <figure className="w-full max-w-2xl overflow-hidden rounded-2xl border border-brand-gold/20 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <video
              controls
              muted
              playsInline
              preload="metadata"
              poster={video.poster}
              aria-label={video.title}
              className="block aspect-video w-full object-cover"
            >
              <source src={video.src} type="video/mp4" />
              <track kind="captions" src={video.captions} srcLang="es" label="Español" default />
            </video>
            <figcaption className="px-4 py-3 text-center text-sm text-text-secondary">
              Guía animada con la interfaz real. Usa los pasos de abajo para avanzar a tu ritmo.
            </figcaption>
          </figure>
        )}
      {/* Orientation hint — mobile only */}
      {isLandscape && (
        <div role="note" className="md:hidden flex flex-col items-center gap-1 text-brand-gold/80 text-sm text-center">
          <span className="text-xs font-bold uppercase tracking-[0.12em]">Vista de mesa horizontal</span>
          <span className="text-xs text-text-secondary">No necesitas girar el teléfono</span>
        </div>
      )}

      {/* Phone frame — width controlled per orientation */}
      <div className="shrink-0 w-full flex justify-center">
        <div data-testid={isLandscape ? 'landscape-preview' : undefined} className={isLandscape ? 'w-full max-w-[560px] md:max-w-[640px]' : 'w-full max-w-[260px] md:max-w-[280px]'}>
          <MockPhoneFrame landscape={isLandscape}>
            <div
              ref={screenRef}
              className="w-full h-full"
              style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
            >
              {steps[currentStep].screen}
            </div>
          </MockPhoneFrame>
        </div>
      </div>

      {/* Player controls — always below phone */}
      <div className="w-full max-w-sm md:max-w-xs flex flex-col items-center">
        <TutorialPlayer
          steps={steps}
          currentStep={currentStep}
          onStepChange={handleStepChange}
        />
      </div>

      {/* Close button — below controls */}
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-text-secondary hover:text-white text-sm font-semibold transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <X className="w-4 h-4" />
          Volver a tutoriales
        </button>
      )}
    </div>
  )
}
