import { act, fireEvent, render, screen, within } from '@testing-library/react'

import PublicRulesPage, { metadata } from '@/app/rules/page'
import { OFFICIAL_RULEBOOK, OFFICIAL_RULEBOOK_VERSION } from '@/lib/official-rulebook'
import { HandTimeline } from '../HandTimeline'
import { RulebookAccordion } from '../RulebookAccordion'
import { HAND_TIMELINE, RULEBOOK_GROUPS, chapterNumber, parseGlossary } from '../rulesGuide'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority: _p, unoptimized: _u, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; unoptimized?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

type Entry = { isIntersecting: boolean; target: Element }
let observerCallback: ((entries: Entry[]) => void) | null = null
const originalObserver = window.IntersectionObserver
const originalScrollIntoView = Element.prototype.scrollIntoView
const scrollIntoViewMock = jest.fn()

beforeEach(() => {
  observerCallback = null
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: jest.fn((callback) => {
      observerCallback = callback
      return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() }
    }),
  })
  Element.prototype.scrollIntoView = scrollIntoViewMock
})

afterEach(() => {
  Object.defineProperty(window, 'IntersectionObserver', { writable: true, configurable: true, value: originalObserver })
  Element.prototype.scrollIntoView = originalScrollIntoView
  window.history.replaceState(null, '', '/')
  jest.clearAllMocks()
})

describe('/rules', () => {
  it('mantiene la metadata pública y canónica', () => {
    expect(metadata.title).toContain('Reglas del Juego')
    expect(metadata.alternates?.canonical).toBe('/rules')
    expect(metadata.robots).toEqual({ index: true, follow: true })
  })

  it('enseña la baraja, las manos, el paso a paso, el desempate y el dinero con lenguaje sencillo', () => {
    render(<PublicRulesPage />)

    expect(screen.getByRole('heading', { level: 1, name: /reglas de la primera/i })).toBeInTheDocument()
    expect(screen.getByText(/reglamento oficial · versión/i)).toHaveTextContent(`versión ${OFFICIAL_RULEBOOK_VERSION}`)
    expect(screen.getByText('cartas en la baraja', { selector: 'dt' })).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 2, name: /las cartas y sus puntos/i })).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'El As vale 16 puntos, no 1.')).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: /baraja española de 28 cartas/i })).toBeInTheDocument()

    const ranking = screen.getByRole('heading', { level: 2, name: /qué mano gana/i }).closest('section')!
    expect(within(ranking).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Segunda',
      'Chivo',
      'Primera',
      'Puntos',
    ])

    expect(screen.getByRole('heading', { level: 2, name: /una mano, paso a paso/i })).toBeInTheDocument()
    expect(screen.getAllByText(/^Paso \d+ de 10$/)).toHaveLength(HAND_TIMELINE.length)

    const tie = screen.getByRole('heading', { level: 2, name: /así se desempata/i }).closest('section')!
    expect(within(tie).getByText(/55 \+ 1 por ser la mano =/i)).toHaveTextContent('56')
    expect(within(tie).getByText(/56 contra 56: empate exacto/i)).toBeInTheDocument()

    const money = screen.getByRole('heading', { level: 2, name: /tiempo y dinero/i }).closest('section')!
    expect(within(money).getByText(/120 segundos/)).toBeInTheDocument()
    expect(within(money).getByText(/60 segundos para volver/)).toBeInTheDocument()
    expect(within(money).getByText(/\$5\.000 de rake y \$95\.000/)).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /crear cuenta gratis/i })).toHaveAttribute('href', '/register/player')
    expect(screen.getByRole('link', { name: /volver al inicio/i })).toHaveAttribute('href', '/')
    const reglamento = screen.getByRole('heading', { level: 2, name: /reglamento completo/i }).closest('section')!
    expect(within(reglamento).getByRole('link', { name: /términos y condiciones/i })).toHaveAttribute('href', '/terms')
  })

  it('incluye el texto oficial completo de los 27 capítulos aunque estén plegados', () => {
    const { container } = render(<PublicRulesPage />)

    for (const section of OFFICIAL_RULEBOOK) {
      const details = container.querySelector(`details#${section.id}`)
      expect(details).not.toBeNull()
      expect(details).not.toHaveAttribute('open')
      expect(screen.getByRole('heading', { level: 4, name: section.title })).toBeInTheDocument()
    }
    expect(screen.getByText(/no existe captura de cartas ni objetivo de 15/i)).toBeInTheDocument()
    expect(screen.getByText(/rake del 5% sobre cada pozo adjudicado/i)).toBeInTheDocument()
    expect(screen.getByText(/durante exactamente 60 segundos/i)).toBeInTheDocument()
  })

  it('cada enlace "Leer regla oficial §N" apunta a un capítulo existente con su número correcto', () => {
    const { container } = render(<PublicRulesPage />)
    const links = screen.getAllByRole('link', { name: /leer regla oficial §\d+/i })
    expect(links.length).toBeGreaterThan(10)
    for (const link of links) {
      const id = link.getAttribute('href')!.slice(1)
      expect(container.querySelector(`details#${id}`)).not.toBeNull()
      expect(link).toHaveTextContent(`§${chapterNumber(id)}`)
    }
  })

  it('no salta niveles de encabezado', () => {
    const { container } = render(<PublicRulesPage />)
    const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4')).map((h) => Number(h.tagName[1]))
    expect(levels[0]).toBe(1)
    levels.reduce((prev, level) => {
      expect(level - prev).toBeLessThanOrEqual(1)
      return level
    })
  })
})

describe('rulesGuide', () => {
  it('agrupa los 27 capítulos en orden, sin repetir ni perder ninguno', () => {
    expect(RULEBOOK_GROUPS.flatMap((group) => group.sections)).toEqual(OFFICIAL_RULEBOOK)
  })

  it('cada paso de la mano referencia capítulos existentes', () => {
    for (const step of HAND_TIMELINE) for (const ref of step.refs) expect(chapterNumber(ref)).toBeGreaterThan(0)
  })

  it('chapterNumber falla con un id inexistente', () => {
    expect(() => chapterNumber('no-existe')).toThrow(/no-existe/)
  })

  it('separa el glosario oficial en términos sin alterar el texto', () => {
    const paragraph = OFFICIAL_RULEBOOK.find((section) => section.id === 'glosario')!.paragraphs[0]
    const entries = parseGlossary(paragraph)
    expect(entries.map((entry) => entry.term)).toEqual(['La Mano', 'Pique', 'Pozo', 'Resto', 'Showdown', 'Rake'])
    expect(entries.map(({ term, definition }) => `${term}: ${definition}`).join(' ')).toBe(paragraph)
  })
})

describe('HandTimeline', () => {
  it('resalta el paso que cruza el centro de la pantalla', () => {
    render(<HandTimeline />)
    const steps = screen.getAllByRole('listitem').filter((li) => li.hasAttribute('data-step-index'))
    expect(steps[0]).toHaveAttribute('aria-current', 'step')

    act(() => {
      observerCallback!([
        { isIntersecting: false, target: steps[1] },
        { isIntersecting: true, target: steps[4] },
      ])
    })
    expect(steps[4]).toHaveAttribute('aria-current', 'step')
    expect(steps[0]).not.toHaveAttribute('aria-current')
    expect(within(steps[1]).getByRole('list', { name: /acciones posibles/i })).toHaveTextContent('VoyPaso')
  })

  it('funciona sin IntersectionObserver', () => {
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, configurable: true, value: undefined })
    render(<HandTimeline />)
    expect(screen.getAllByText(/^Paso 1 de/)).toHaveLength(1)
  })
})

describe('RulebookAccordion', () => {
  const details = (container: HTMLElement) => Array.from(container.querySelectorAll('details'))

  it('"Abrir todos" y "Cerrar todos" pliegan y despliegan cada capítulo', () => {
    const { container } = render(<RulebookAccordion />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir todos' }))
    expect(details(container).every((d) => d.open)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todos' }))
    expect(details(container).some((d) => d.open)).toBe(false)
  })

  it('abre el capítulo del hash al cargar y al cambiar el hash', () => {
    window.history.replaceState(null, '', '/rules#desempates')
    const { container } = render(<RulebookAccordion />)
    expect(container.querySelector<HTMLDetailsElement>('#desempates')!.open).toBe(true)
    expect(scrollIntoViewMock).toHaveBeenCalled()

    act(() => {
      window.history.replaceState(null, '', '/rules#rake')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(container.querySelector<HTMLDetailsElement>('#rake')!.open).toBe(true)
  })

  it('ignora hashes vacíos o que no son capítulos', () => {
    const { container } = render(<RulebookAccordion />)
    act(() => {
      window.history.replaceState(null, '', '/rules#bloque-dinero')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(details(container).some((d) => d.open)).toBe(false)
    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })

  it('muestra el glosario como lista de términos', () => {
    render(<RulebookAccordion />)
    const glossary = screen.getByRole('heading', { level: 4, name: /glosario/i }).closest('details')!
    expect(within(glossary).getByText('Rake:')).toBeInTheDocument()
    expect(within(glossary).getByText(/comisión del 5% sobre el pozo adjudicado/)).toBeInTheDocument()
  })
})
