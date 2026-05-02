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

interface TutorialWalkthroughProps {
  steps: TutorialStep[]
  className?: string
  onClose?: () => void
}

export function TutorialWalkthrough({ steps, className = '', onClose }: TutorialWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const screenRef = useRef<HTMLDivElement>(null)
  const isAnimating = useRef(false)

  const isLandscape = steps[currentStep]?.landscape ?? false

  const animateTransition = useCallback(
    (nextStep: number, direction: 'next' | 'prev') => {
      if (isAnimating.current || !screenRef.current) return
      if (nextStep < 0 || nextStep >= steps.length) return

      isAnimating.current = true
      const isForward = direction === 'next'

      const tl = gsap.timeline({
        onComplete: () => {
          isAnimating.current = false
        },
      })

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
    if (screenRef.current) {
      gsap.fromTo(
        screenRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      )
    }
  }, [])

  return (
    <div className={`flex flex-col items-center justify-center gap-4 md:gap-6 ${className}`}>
      {/* Orientation hint — mobile only */}
      {isLandscape && (
        <div className="md:hidden flex items-center gap-2 text-brand-gold/70 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span className="text-xs font-medium">Pantalla horizontal durante el juego</span>
        </div>
      )}

      {/* Phone frame — width controlled per orientation */}
      <div className="shrink-0 w-full flex justify-center">
        <div className={isLandscape ? 'w-full max-w-[560px] md:max-w-[640px]' : 'w-full max-w-[260px] md:max-w-[280px]'}>
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
          className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-text-secondary hover:text-white text-sm font-semibold transition-all"
        >
          <X className="w-4 h-4" />
          Volver a tutoriales
        </button>
      )}
    </div>
  )
}