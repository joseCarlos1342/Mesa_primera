import { render, screen } from '@testing-library/react'
import ConsultasPage from '../page'
import { globalSearch } from '@/app/actions/admin-search'

jest.mock('@/app/actions/admin-search', () => ({
  globalSearch: jest.fn(),
}))

const mockGlobalSearch = globalSearch as jest.MockedFunction<typeof globalSearch>

describe('ConsultasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra guia de consulta cuando no hay query', async () => {
    render(await ConsultasPage({ searchParams: Promise.resolve({ q: '   ' }) }))

    expect(screen.getByRole('heading', { name: 'Consultas Globales' })).toBeInTheDocument()
    expect(screen.getByText(/Ingresa un ID de transacción/)).toBeInTheDocument()
    expect(screen.getByText('ledger')).toBeInTheDocument()
    expect(screen.getByText('replay')).toBeInTheDocument()
    expect(screen.getByText('user')).toBeInTheDocument()
    expect(mockGlobalSearch).not.toHaveBeenCalled()
  })

  it('lista resultados, enlaces por entidad y CTA de disputa con evidencia', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'abc-123',
        detected: { raw: 'abc-123', type: 'uuid', normalized: 'abc-123' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [
          { entity: 'ledger', id: 'ledger-1', label: 'Movimiento inicial', detail: 'credit' },
          { entity: 'replay', id: 'game-1', label: 'Partida auditada', detail: 'seed' },
          { entity: 'alert', id: 'alert-1', label: 'Alerta activa', detail: 'critical' },
        ],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: '  abc-123  ' }) }))

    expect(mockGlobalSearch).toHaveBeenCalledWith('abc-123')
    expect(screen.getByText('uuid')).toBeInTheDocument()
    expect(screen.getByText('3 coincidencias encontradas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ledger movimiento inicial credit ledger-1/i })).toHaveAttribute('href', '/admin/ledger')
    expect(screen.getByRole('link', { name: /replay partida auditada seed game-1/i })).toHaveAttribute('href', '/admin/replays/game-1')
    expect(screen.getByRole('link', { name: /alert alerta activa critical alert-1/i })).toHaveAttribute('href', '/admin/server-log')
    expect(screen.getByRole('link', { name: /abrir disputa/i })).toHaveAttribute('href', expect.stringContaining('/admin/disputes/new?q=abc-123'))
  })

  it('muestra empty state cuando la busqueda no tiene coincidencias', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: { query: 'nadie', detected: { raw: 'nadie', type: 'unknown', normalized: 'nadie' }, searched_at: '2026-05-25T10:00:00.000Z', matches: [] },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'nadie' }) }))

    expect(screen.getByText('No se encontraron coincidencias para esta consulta.')).toBeInTheDocument()
  })

  it('muestra error de busqueda global', async () => {
    mockGlobalSearch.mockResolvedValue({ error: 'Indice no disponible' })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'abc' }) }))

    expect(screen.getByText('Indice no disponible')).toBeInTheDocument()
  })

  it('enlaza a /admin/deposits cuando el match es de tipo deposit', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'dep-1',
        detected: { raw: 'dep-1', type: 'uuid', normalized: 'dep-1' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [{ entity: 'deposit', id: 'dep-1', label: 'Depósito', detail: 'pending' }],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'dep-1' }) }))

    expect(
      screen.getByRole('link', { name: /deposit.*dep-1/i }),
    ).toHaveAttribute('href', '/admin/deposits')
  })

  it('enlaza a /admin/withdrawals cuando el match es de tipo withdrawal', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'wit-1',
        detected: { raw: 'wit-1', type: 'uuid', normalized: 'wit-1' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [{ entity: 'withdrawal', id: 'wit-1', label: 'Retiro', detail: 'completed' }],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'wit-1' }) }))

    expect(
      screen.getByRole('link', { name: /withdrawal.*wit-1/i }),
    ).toHaveAttribute('href', '/admin/withdrawals')
  })

  it('enlaza a /admin/users/{id} cuando el match es de tipo user', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'user-1',
        detected: { raw: 'user-1', type: 'uuid', normalized: 'user-1' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [{ entity: 'user', id: 'user-1', label: 'Ana', detail: '@ana' }],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'user-1' }) }))

    expect(
      screen.getByRole('link', { name: /user.*user-1/i }),
    ).toHaveAttribute('href', '/admin/users/user-1')
  })

  it('enlaza a /admin/soporte/{id} cuando el match es de tipo ticket', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'tick-1',
        detected: { raw: 'tick-1', type: 'uuid', normalized: 'tick-1' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [{ entity: 'ticket', id: 'tick-1', label: 'Ticket', detail: 'open' }],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'tick-1' }) }))

    expect(
      screen.getByRole('link', { name: /ticket.*tick-1/i }),
    ).toHaveAttribute('href', '/admin/soporte/tick-1')
  })

  it('renderiza el fallback "#" con color gris cuando el match es de una entidad desconocida', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'x-1',
        detected: { raw: 'x-1', type: 'uuid', normalized: 'x-1' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [{ entity: 'unknown_entity' as any, id: 'x-1', label: 'X', detail: 'y' }],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'x-1' }) }))

    const link = screen.getByRole('link', { name: /unknown_entity/i })
    expect(link).toHaveAttribute('href', '#')
  })

  it('muestra "1 coincidencia encontrada" en singular cuando hay exactamente un match', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'one-1',
        detected: { raw: 'one-1', type: 'uuid', normalized: 'one-1' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [{ entity: 'ledger', id: 'one-1', label: 'Solo', detail: 'x' }],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: 'one-1' }) }))

    expect(screen.getByText('1 coincidencia encontrada')).toBeInTheDocument()
  })
})
