import { render } from '@testing-library/react'
import { LandingAnimations } from '../LandingAnimations'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

jest.mock('@gsap/react', () => ({
  useGSAP: (callback: () => void) => callback(),
}))

type TimelineMock = { from: jest.Mock<TimelineMock> }
type BatchOptions = {
  onEnter: (batch: Element[]) => void
  onLeaveBack: (batch: Element[]) => void
}
const timelineApi = {} as TimelineMock
const timelineFrom = jest.fn(() => timelineApi)
timelineApi.from = timelineFrom

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => timelineApi),
    to: jest.fn(),
    from: jest.fn(),
    fromTo: jest.fn(),
    matchMedia: jest.fn(() => ({ add: jest.fn((_, callback) => callback()) })),
    utils: {
      toArray: jest.fn((selector: string) => Array.from(document.querySelectorAll(selector))),
    },
  },
}))

jest.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { batch: jest.fn() },
}))

function renderAnimationHarness(reducedMotion = false) {
  const container = document.createElement('div')
  container.innerHTML = `
    <h1 data-hero-title>Hero</h1>
    <p data-hero-subtitle>Subtitle</p>
    <a data-hero-cta href="/login/player">CTA</a>
    <span data-hero-hint>Hint</span>
    <div data-float></div>
    <h2 data-wave-heading><span class="wave-char">A</span><span class="wave-char">B</span></h2>
    <section data-reveal></section>
    <section data-reveal-left></section>
    <section data-reveal-right></section>
    <article data-stagger-card></article>
    <article data-step></article>
    <div data-gold-line></div>
    <div data-divider></div>
  `
  document.body.appendChild(container)
  window.matchMedia = jest.fn(() => ({ matches: reducedMotion })) as any

  return render(<LandingAnimations containerRef={{ current: container }} />)
}

describe('LandingAnimations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('registra ScrollTrigger y configura animaciones principales cuando hay movimiento permitido', () => {
    renderAnimationHarness(false)

    expect(gsap.timeline).toHaveBeenCalledWith({ defaults: { ease: 'power4.out' } })
    expect(timelineFrom).toHaveBeenCalledWith('[data-hero-title]', { y: 80, opacity: 0, duration: 1.2 })
    expect(gsap.to).toHaveBeenCalledWith(expect.any(Element), expect.objectContaining({ repeat: -1, yoyo: true }))
    expect(gsap.fromTo).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ y: 40, opacity: 0, scale: 0.7 }),
      expect.objectContaining({ scrollTrigger: expect.objectContaining({ start: 'top 85%' }) })
    )
    expect(ScrollTrigger.batch).toHaveBeenCalledWith('[data-stagger-card]', expect.objectContaining({ start: 'top 88%' }))
    expect(gsap.matchMedia).toHaveBeenCalled()
  })

  it('ejecuta los callbacks de entrada y salida del batch de tarjetas', () => {
    renderAnimationHarness(false)

    const batchElement = document.querySelector('[data-stagger-card]') as Element
    const batchOptions = (ScrollTrigger.batch as jest.Mock).mock.calls[0][1] as BatchOptions

    batchOptions.onEnter([batchElement])
    expect(gsap.to).toHaveBeenLastCalledWith(
      [batchElement],
      expect.objectContaining({ y: 0, opacity: 1, scale: 1, overwrite: true }),
    )

    batchOptions.onLeaveBack([batchElement])
    expect(gsap.to).toHaveBeenLastCalledWith(
      [batchElement],
      expect.objectContaining({ y: 50, opacity: 0, scale: 0.92, overwrite: true }),
    )
  })

  it('no configura animaciones si el usuario prefiere movimiento reducido', () => {
    renderAnimationHarness(true)

    expect(gsap.timeline).not.toHaveBeenCalled()
    expect(ScrollTrigger.batch).not.toHaveBeenCalled()
  })

  it('sale sin efectos si el contenedor todavia no esta disponible', () => {
    render(<LandingAnimations containerRef={{ current: null }} />)

    expect(gsap.timeline).not.toHaveBeenCalled()
  })
})
