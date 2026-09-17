import { fireEvent, render, screen } from '@testing-library/react'
import gsap from 'gsap'

import { TutorialWalkthrough } from '../TutorialWalkthrough'

type MockTimeline = {
  to: () => MockTimeline
  call: (fn: () => void) => MockTimeline
  set: () => MockTimeline
}

let completeTimelineImmediately = true
let pendingTimelineComplete: (() => void) | undefined

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: jest.fn((config?: { onComplete?: () => void }) => {
      const api: MockTimeline = {
        to: jest.fn((): MockTimeline => {
          if (completeTimelineImmediately) {
            config?.onComplete?.()
          } else {
            pendingTimelineComplete = config?.onComplete
          }
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

  beforeEach(() => {
    jest.clearAllMocks()
    completeTimelineImmediately = true
    pendingTimelineComplete = undefined
  })

  it('renderiza el primer paso dentro del frame y el player', () => {
    render(<TutorialWalkthrough steps={steps} />)

    expect(screen.getByTestId('mock-phone-frame')).toHaveAttribute('data-landscape', 'false')
    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()
    expect(screen.getByText(/paso actual: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/total pasos: 2/i)).toBeInTheDocument()
  })

  it('cambia al siguiente paso y aclara que no hay que girar el teléfono', () => {
    render(<TutorialWalkthrough steps={steps} />)

    fireEvent.click(screen.getByRole('button', { name: /ir al paso 2/i }))

    expect(screen.getByText('Pantalla 2')).toBeInTheDocument()
    expect(screen.getByTestId('mock-phone-frame')).toHaveAttribute('data-landscape', 'true')
    expect(screen.getByText(/vista de mesa horizontal/i)).toBeInTheDocument()
    expect(screen.getByText(/no necesitas girar el teléfono/i)).toBeInTheDocument()
    expect(screen.queryByText(/gira el teléfono/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('landscape-preview')).toBeInTheDocument()
  })

  it('permite volver al paso anterior y bloquea cambios fuera de rango', () => {
    render(<TutorialWalkthrough steps={steps} />)

    fireEvent.click(screen.getByRole('button', { name: /ir al paso 2/i }))
    fireEvent.click(screen.getByRole('button', { name: /ir al paso 1/i }))

    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ir fuera de rango/i }))

    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()
  })

  it('ignora cambios de paso mientras una animación sigue pendiente', () => {
    completeTimelineImmediately = false
    render(<TutorialWalkthrough steps={steps} />)

    fireEvent.click(screen.getByRole('button', { name: /ir al paso 2/i }))
    expect(screen.getByText('Pantalla 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ir al paso 1/i }))
    expect(screen.getByText('Pantalla 2')).toBeInTheDocument()

    pendingTimelineComplete?.()
    fireEvent.click(screen.getByRole('button', { name: /ir al paso 1/i }))
    expect(screen.getByText('Pantalla 1')).toBeInTheDocument()
  })

  it('llama onClose cuando se hace click en volver a tutoriales', () => {
    const onClose = jest.fn()
    render(<TutorialWalkthrough steps={steps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /volver a tutoriales/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('expone el tutorial como diálogo accesible', () => {
    render(<TutorialWalkthrough steps={steps} />)

    expect(screen.getByRole('dialog', { name: /tutorial interactivo/i })).toBeInTheDocument()
  })

  it('cambia de paso inmediatamente cuando se prefiere movimiento reducido', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia

    render(<TutorialWalkthrough steps={steps} />)
    fireEvent.click(screen.getByRole('button', { name: /ir al paso 2/i }))

    expect(screen.getByText('Pantalla 2')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /tutorial interactivo/i })).toBeInTheDocument()
    expect(gsap.timeline).not.toHaveBeenCalled()

    window.matchMedia = originalMatchMedia
  })

  it('muestra un estado seguro cuando no hay pasos', () => {
    render(<TutorialWalkthrough steps={[]} />)

    expect(screen.getByRole('dialog', { name: /tutorial interactivo/i })).toBeInTheDocument()
    expect(screen.getByText(/no tiene pasos disponibles/i)).toBeInTheDocument()
  })

  it('muestra el video opcional con poster y controles accesibles', () => {
    const { container } = render(
      <TutorialWalkthrough
        steps={steps}
        video={{
          src: '/tutorials/register-tutorial.mp4',
          poster: '/tutorials/register-tutorial-poster.png',
          title: 'Guía animada para registrarte',
          captions: '/tutorials/register-tutorial.vtt',
        }}
      />,
    )

    const video = container.querySelector('video')
    expect(video).toHaveAttribute('aria-label', 'Guía animada para registrarte')
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('poster', '/tutorials/register-tutorial-poster.png')
    expect(video?.querySelector('source')).toHaveAttribute('src', '/tutorials/register-tutorial.mp4')
    expect(video?.querySelector('track')).toHaveAttribute('src', '/tutorials/register-tutorial.vtt')
  })
})
