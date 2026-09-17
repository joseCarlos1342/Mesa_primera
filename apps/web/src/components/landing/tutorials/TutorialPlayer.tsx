'use client'

import { useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TutorialPlayerProps {
  steps: { label: string }[]
  currentStep: number
  onStepChange: (step: number) => void
}

export function TutorialPlayer({ steps, currentStep, onStepChange }: TutorialPlayerProps) {
  const total = steps.length
  const safeCurrentStep = total > 0 ? Math.min(Math.max(currentStep, 0), total - 1) : 0
  const isFirst = safeCurrentStep === 0
  const isLast = safeCurrentStep === total - 1

  const handlePrev = useCallback(() => {
    if (!isFirst) onStepChange(safeCurrentStep - 1)
  }, [isFirst, onStepChange, safeCurrentStep])

  const handleNext = useCallback(() => {
    if (!isLast) onStepChange(safeCurrentStep + 1)
  }, [isLast, onStepChange, safeCurrentStep])

  if (total === 0) {
    return <p className="text-center text-text-secondary">Este tutorial no tiene pasos disponibles.</p>
  }

  return (
    <div className="w-full">
      {/* Step dots + progress line */}
      <div className="flex items-center justify-center gap-0 mb-3">
        {steps.map((step, i) => {
          const isActive = i === safeCurrentStep
          const isCompleted = i < safeCurrentStep
          return (
            <div key={i} className="flex items-center">
              {/* Dot */}
              <button
                type="button"
                onClick={() => onStepChange(i)}
                className="group relative flex h-11 w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a180e]"
                aria-label={`Paso ${i + 1}: ${step.label}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold
                    transition-[transform,background-color,color,box-shadow,border-color] duration-500
                    ${isActive
                      ? 'bg-brand-gold text-black scale-110 shadow-lg shadow-brand-gold/30'
                      : isCompleted
                        ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                        : 'bg-white/5 text-text-secondary border border-white/10'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>

                {/* Tooltip on hover */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {i < total - 1 && (
                <div className="relative w-4 md:w-6 h-px mx-0.5">
                  <div className="absolute inset-0 bg-white/10" />
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-gold/60 transition-all duration-500"
                    style={{ width: i < currentStep ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current step label */}
      <p aria-live="polite" className="text-center text-xs md:text-sm text-brand-gold font-medium mb-3 h-4 md:h-5 leading-tight">
        {steps[safeCurrentStep].label}
      </p>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirst}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold
            transition-[background-color,border-color,color,opacity] duration-300
            ${isFirst
              ? 'opacity-30 cursor-not-allowed'
              : 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 hover:border-white/20'
            }
          `}
        >
          <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <div className="text-[10px] md:text-xs text-text-secondary whitespace-nowrap">
          <span aria-live="polite">
          {safeCurrentStep + 1} / {total}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={isLast}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold
            transition-[background-color,box-shadow,color,opacity] duration-300
            ${isLast
              ? 'bg-brand-gold/20 text-brand-gold/50 cursor-default'
              : 'bg-brand-gold hover:bg-brand-gold-light text-black shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/40'
            }
          `}
        >
          <span className="hidden sm:inline">{isLast ? 'Completado' : 'Siguiente'}</span>
          <span className="sm:hidden">{isLast ? 'Listo' : 'Sig'}</span>
          {!isLast && <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />}
        </button>
      </div>
    </div>
  )
}
