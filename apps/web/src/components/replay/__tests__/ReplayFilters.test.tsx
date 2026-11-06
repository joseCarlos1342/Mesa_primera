import { render, screen } from '@testing-library/react'
import {
  REPLAY_PERIODS,
  ReplayPeriodFilter,
  periodLabel,
  replayQuery,
} from '../ReplayFilters'
import type { ReplayFilters } from '@/app/actions/replays'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('REPLAY_PERIODS y periodLabel', () => {
  it('expone los cuatro periodos canónicos', () => {
    expect(REPLAY_PERIODS).toEqual(['7d', '30d', '90d', 'all'])
  })

  it('traduce cada periodo a su etiqueta en español', () => {
    expect(periodLabel('7d')).toBe('7 días')
    expect(periodLabel('30d')).toBe('30 días')
    expect(periodLabel('90d')).toBe('90 días')
    expect(periodLabel('all')).toBe('Todo')
  })
})

describe('replayQuery', () => {
  it('devuelve cadena vacía con el periodo por defecto y sin fechas', () => {
    expect(replayQuery({ period: '7d' })).toBe('')
  })

  it('serializa el periodo cuando no es el valor por defecto', () => {
    expect(replayQuery({ period: '30d' })).toBe('?period=30d')
    expect(replayQuery({ period: 'all' })).toBe('?period=all')
  })

  it('añade las fechas desde/hasta cuando están presentes', () => {
    expect(replayQuery({ period: '7d', from: '2026-01-01' })).toBe('?period=7d&from=2026-01-01')
    expect(replayQuery({ period: '7d', to: '2026-02-01' })).toBe('?period=7d&to=2026-02-01')
    expect(replayQuery({ period: '90d', from: '2026-01-01', to: '2026-02-01' })).toBe(
      '?period=90d&from=2026-01-01&to=2026-02-01',
    )
  })
})

describe('ReplayPeriodFilter', () => {
  it('marca como activo el periodo elegido cuando no hay rango personalizado', () => {
    const filters: ReplayFilters = { period: '30d' }
    render(<ReplayPeriodFilter filters={filters} />)

    const active = screen.getByRole('link', { name: '30 días' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveAttribute('href', '/replays?period=30d')

    const inactive = screen.getByRole('link', { name: '7 días' })
    expect(inactive).not.toHaveAttribute('aria-current')
  })

  it('no marca ningún periodo activo cuando hay fechas personalizadas y abre el detalle', () => {
    const filters: ReplayFilters = { period: '7d', from: '2026-01-01' }
    render(<ReplayPeriodFilter filters={filters} />)

    expect(screen.getByRole('link', { name: '7 días' })).not.toHaveAttribute('aria-current')
    // El acordeón "Elegir fechas" se abre porque hay un rango personalizado.
    const details = screen.getByText('Elegir fechas').closest('details')
    expect(details).toHaveAttribute('open')
    // Los campos conservan los valores de los filtros.
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-01-01')
  })

  it('mantiene el acordeón cerrado cuando no hay rango personalizado', () => {
    const filters: ReplayFilters = { period: '7d' }
    render(<ReplayPeriodFilter filters={filters} />)
    const details = screen.getByText('Elegir fechas').closest('details')
    expect(details).not.toHaveAttribute('open')
  })
})
