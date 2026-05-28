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
})
