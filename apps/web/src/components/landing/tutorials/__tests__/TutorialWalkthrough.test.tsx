import { fireEvent, render, screen } from '@testing-library/react'

import { TutorialWalkthrough } from '../TutorialWalkthrough'

type MockTimeline = {
  to: () => MockTimeline
  call: (fn: () => void) => MockTimeline
  set: () => MockTimeline
}

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: jest.fn((config?: { onComplete?: () => void }) => {
      const api: MockTimeline = {
        to: jest.fn((): MockTimeline => {
          config?.onComplete?.()
          return api
        }),
        call: jest.fn((fn: () => void): MockTimeline => {
          fn()
          return api
        }),
        set: jest.fn((): MockTimeline => api),
      }

      return api
    }),
    fromTo: jest.fn(),
  },
}))

jest.mock('../MockPhoneFrame', () => ({
  MockPhoneFrame: ({ children, landscape }: { children: React.ReactNode; landscape?: boolean }) => (
    <div data-landscape={landscape ? 'true' : 'false'} data-testid="mock-phone-frame">{children}</div>
  ),
}))

jest.mock('../TutorialPlayer', () => ({
  TutorialPlayer: ({ currentStep, onStepChange, steps }: { currentStep: number; onStepChange: (step: number) => void; steps: { label: string }[] }) => (
    <div>
      <span>Paso actual: {currentStep + 1}</span>
      <span>Total pasos: {steps.length}</span>
      <button type="button" onClick={() => onStepChange(0)}>Ir al paso 1</button>
      <button type="button" onClick={() => onStepChange(1)}>Ir al paso 2</button>
      <button type="button" onClick={() => onStepChange(-1)}>Ir fuera de rango</button>
    </div>
  ),
}))

describe('TutorialWalkthrough', () => {
  const steps = [
    { label: 'Paso 1', screen: <div>Pantalla 1</div> },
    { label: 'Paso 2', screen: <div>Pantalla 2</div>, landscape: true },
  ]

  it('renderiza el primer paso dentro del frame y el player', () => {
    render(<TutorialWalkthrough steps={steps} />)

    expect(screen.getByTestId('mock-phone-frame')).toHaveAttribute('data-landscape', 'false')
    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()
    expect(screen.getByText(/paso actual: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/total pasos: 2/i)).toBeInTheDocument()
  })

  it('cambia al siguiente paso y muestra hint horizontal cuando aplica', () => {
    render(<TutorialWalkthrough steps={steps} />)

    fireEvent.click(screen.getByRole('button', { name: /ir al paso 2/i }))

    expect(screen.getByText('Pantalla 2')).toBeInTheDocument()
    expect(screen.getByTestId('mock-phone-frame')).toHaveAttribute('data-landscape', 'true')
    expect(screen.getByText(/pantalla horizontal durante el juego/i)).toBeInTheDocument()
  })

  it('permite volver al paso anterior y bloquea cambios fuera de rango', () => {
    render(<TutorialWalkthrough steps={steps} />)

    fireEvent.click(screen.getByRole('button', { name: /ir al paso 2/i }))
    fireEvent.click(screen.getByRole('button', { name: /ir al paso 1/i }))

    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ir fuera de rango/i }))

    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()
  })

  it('llama onClose cuando se hace click en volver a tutoriales', () => {
    const onClose = jest.fn()
    render(<TutorialWalkthrough steps={steps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /volver a tutoriales/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
