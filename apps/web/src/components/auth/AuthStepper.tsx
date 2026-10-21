/** Pasos del registro de jugador (celular o Google): los dos terminan en código, clave y huella. */
export const REGISTER_STEPS = ['Tus datos', 'Código', 'Clave', 'Huella'] as const
/** Pasos de la recuperación de clave. */
export const RECOVERY_STEPS = ['Celular', 'Código', 'Nueva clave'] as const

interface AuthStepperProps {
  readonly labels: readonly string[]
  /** Paso actual, empezando en 1. */
  readonly current: number
}

/** "Paso X de N" con un filete de latón por paso: hecho, actual y pendiente. */
export function AuthStepper({ labels, current }: AuthStepperProps) {
  const total = labels.length
  const active = Math.min(Math.max(current, 1), total)

  return (
    <div role="group" aria-label="Progreso" className="mb-8">
      <p className="text-base font-semibold text-[#c5a059]">
        Paso <span className="font-mono tabular-nums">{active}</span> de{' '}
        <span className="font-mono tabular-nums">{total}</span>
      </p>
      <ol className="m-0 mt-3 grid list-none gap-2 p-0" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {labels.map((label, index) => {
          const step = index + 1
          const state = step < active ? 'done' : step === active ? 'current' : 'todo'
          return (
            <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined} className="min-w-0">
              <span
                aria-hidden="true"
                className={`block h-1 rounded-full ${
                  state === 'done' ? 'bg-brand-gold' : state === 'current' ? 'bg-brand-gold-light' : 'bg-[#8b6b2e]/40'
                }`}
              />
              <span
                className={`mt-2 block truncate text-sm sm:text-base ${
                  state === 'current'
                    ? 'font-semibold text-text-premium'
                    : state === 'done'
                      ? 'text-[#d9d3bf]'
                      : 'text-[#8a8478]'
                }`}
              >
                {label}
                {state === 'done' && <span className="sr-only"> (completado)</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
