import { fireEvent, render, screen } from '@testing-library/react'

import { TutorialWalkthrough } from '../TutorialWalkthrough'

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: jest.fn(() => ({
      to: jest.fn().mockReturnThis(),
      call: jest.fn((fn: () => void) => {
        fn()
        return { set: jest.fn().mockReturnThis(), to: jest.fn().mockReturnThis() }
      }),
      set: jest.fn().mockReturnThis(),
    })),
    fromTo: jest.fn(),
  },
}))

jest.mock('../MockPhoneFrame', () => ({
  MockPhoneFrame: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-phone-frame">{children}</div>,
}))

jest.mock('../TutorialPlayer', () => ({
  TutorialPlayer: ({ currentStep, onStepChange, steps }: { currentStep: number; onStepChange: (step: number) => void; steps: { label: string }[] }) => (
    <div>
      <span>Paso actual: {currentStep + 1}</span>
      <span>Total pasos: {steps.length}</span>
      <button type="button" onClick={() => onStepChange(1)}>Ir al paso 2</button>
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

    expect(screen.getByTestId('mock-phone-frame')).toBeInTheDocument()
    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()
    expect(screen.getByText(/paso actual: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/total pasos: 2/i)).toBeInTheDocument()
  })

  it('cambia al siguiente paso y muestra hint horizontal cuando aplica', () => {
    render(<TutorialWalkthrough steps={steps} />)

    fireEvent.click(screen.getByRole('button', { name: /ir al paso 2/i }))

    expect(screen.getByText('Pantalla 2')).toBeInTheDocument()
    expect(screen.getByText(/pantalla horizontal durante el juego/i)).toBeInTheDocument()
  })

  it('llama onClose cuando se hace click en volver a tutoriales', () => {
    const onClose = jest.fn()
    render(<TutorialWalkthrough steps={steps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /volver a tutoriales/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
