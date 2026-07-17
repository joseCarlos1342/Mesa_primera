import { render, screen } from '@testing-library/react'
import ConsultasPage from '../page'
import { globalSearch } from '@/app/actions/admin-search'
import {
  listAdminIssueTickets,
  countAdminArchivedIssueTickets,
} from '@/app/actions/admin-issues'

jest.mock('@/app/actions/admin-search', () => ({
  globalSearch: jest.fn(),
}))
jest.mock('@/app/actions/admin-issues', () => ({
  listAdminIssueTickets: jest.fn(),
  countAdminArchivedIssueTickets: jest.fn(),
}))

const mockGlobalSearch = globalSearch as jest.MockedFunction<typeof globalSearch>
const mockListAdminIssueTickets = listAdminIssueTickets as jest.MockedFunction<typeof listAdminIssueTickets>
const mockCountArchived = countAdminArchivedIssueTickets as jest.MockedFunction<
  typeof countAdminArchivedIssueTickets
>

function makeTicket(overrides: Partial<{ id: string; status: 'open' | 'closed' | 'investigating' | 'resolved'; description: string }> = {}) {
  return {
    id: 'issue-1',
    user_id: 'user-1',
    category: 'table_error',
    status: 'open' as const,
    description: 'desc',
    transaction_reference: null,
    table_reference: null,
    occurred_at: '2026-07-12T10:00:00.000Z',
    resolution_notes: null,
    created_at: '2026-07-12T10:00:00.000Z',
    updated_at: '2026-07-12T10:00:00.000Z',
    ...overrides,
  }
}

describe('ConsultasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListAdminIssueTickets.mockResolvedValue({ data: [] })
    mockCountArchived.mockResolvedValue({ data: 0 })
  })

  it('muestra guia de consulta cuando no hay query', async () => {
    render(await ConsultasPage({ searchParams: Promise.resolve({ q: '   ' }) }))

    expect(screen.getByRole('heading', { name: 'Consultas e Incidencias' })).toBeInTheDocument()
    expect(screen.getByText('Bandeja de reclamos')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Buscar en consultas globales' })).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: /buscar/i })
    expect(submit).toHaveAttribute('type', 'submit')
    expect(submit).toHaveAttribute('aria-label', 'Buscar')
    // El icono de lupa va dentro del botón
    expect(submit.querySelector('svg')).not.toBeNull()
    // El label visible "Buscar" está oculto en mobile y se muestra en >=sm
    const visibleLabel = submit.querySelector('span')
    expect(visibleLabel).not.toBeNull()
    expect(visibleLabel?.className ?? '').toMatch(/hidden/)
    expect(visibleLabel?.className ?? '').toMatch(/sm:inline/)
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
          { entity: 'replay', id: 'replay-1', target_id: 'game-1', label: 'Partida auditada', detail: 'seed' },
          { entity: 'alert', id: 'alert-1', label: 'Alerta activa', detail: 'critical' },
        ],
      },
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({ q: '  abc-123  ' }) }))

    expect(mockGlobalSearch).toHaveBeenCalledWith('abc-123')
    expect(screen.getByText('uuid')).toBeInTheDocument()
    expect(screen.getByText('3 coincidencias encontradas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ledger movimiento inicial credit ledger-1/i })).toHaveAttribute('href', '/admin/ledger?q=ledger-1')
    expect(screen.getByRole('link', { name: /replay partida auditada seed replay-1/i })).toHaveAttribute('href', '/admin/replays/game-1')
    expect(screen.getByRole('link', { name: /alert alerta activa critical alert-1/i })).toHaveAttribute('href', '/admin/server-log?q=alert-1')
    expect(screen.getByRole('link', { name: /abrir investigación/i })).toHaveAttribute('href', expect.stringContaining('/admin/disputes/new?q=abc-123'))
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

  it('enlaza al depósito filtrado cuando el match es de tipo deposit', async () => {
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
    ).toHaveAttribute('href', '/admin/deposits?q=dep-1')
  })

  it('enlaza al retiro filtrado cuando el match es de tipo withdrawal', async () => {
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
    ).toHaveAttribute('href', '/admin/withdrawals?q=wit-1')
  })

  it('enlaza al usuario filtrado cuando el match es de tipo user', async () => {
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
    ).toHaveAttribute('href', '/admin/users?q=user-1')
  })

  it('enlaza al ticket seleccionado cuando el match es de tipo ticket', async () => {
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
    ).toHaveAttribute('href', '/admin/support?ticket=tick-1')
  })

  it('renderiza el fallback "#" con color gris cuando el match es de una entidad desconocida', async () => {
    mockGlobalSearch.mockResolvedValue({
      data: {
        query: 'x-1',
        detected: { raw: 'x-1', type: 'uuid', normalized: 'x-1' },
        searched_at: '2026-05-25T10:00:00.000Z',
        matches: [{ entity: 'unknown_entity' as never, id: 'x-1', label: 'X', detail: 'y' }],
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

  it('la bandeja principal solo lista tickets con status "open"', async () => {
    mockListAdminIssueTickets.mockResolvedValue({
      data: [
        makeTicket({ id: 'open-1', status: 'open', description: 'pendiente uno' }),
        makeTicket({ id: 'closed-1', status: 'closed', description: 'cerrado no debe verse' }),
        makeTicket({ id: 'resolved-1', status: 'resolved', description: 'resuelto no debe verse' }),
        makeTicket({ id: 'investigating-1', status: 'investigating', description: 'investigando no debe verse' }),
        makeTicket({ id: 'open-2', status: 'open', description: 'pendiente dos' }),
      ],
    })

    render(await ConsultasPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText('pendiente uno')).toBeInTheDocument()
    expect(screen.getByText('pendiente dos')).toBeInTheDocument()
    expect(screen.queryByText('cerrado no debe verse')).not.toBeInTheDocument()
    expect(screen.queryByText('resuelto no debe verse')).not.toBeInTheDocument()
    expect(screen.queryByText('investigando no debe verse')).not.toBeInTheDocument()
  })

  it('muestra el chip "Archivo (N)" con el contador de archivadas (cabecera y pie)', async () => {
    mockCountArchived.mockResolvedValue({ data: 3 })

    render(await ConsultasPage({ searchParams: Promise.resolve({}) }))

    // Hay dos chips (cabecera sm+ y pie mobile), ambos con el mismo href
    const links = screen.getAllByRole('link', { name: /archivo \(3\)/i })
    expect(links.length).toBe(2)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/admin/consultas/archive')
      // Cada chip debe tener fondo teal/10 y borde teal/30 para tener presencia visual
      expect(link.className).toMatch(/bg-teal-/)
      expect(link.className).toMatch(/border-teal-/)
    }
    // El chip de cabecera se oculta en mobile y aparece en sm+
    const headerChip = links.find((l) => l.className.includes('hidden') && l.className.includes('sm:inline-flex'))
    expect(headerChip).toBeDefined()
    // El chip de pie aparece en mobile y se oculta en sm+
    const footerChip = links.find((l) => l.className.includes('sm:hidden'))
    expect(footerChip).toBeDefined()
  })

  it('oculta el link al archivo cuando no hay consultas archivadas', async () => {
    mockCountArchived.mockResolvedValue({ data: 0 })

    render(await ConsultasPage({ searchParams: Promise.resolve({}) }))

    expect(screen.queryByRole('link', { name: /ver archivo/i })).not.toBeInTheDocument()
  })

  it('muestra error del contador de archivadas de forma resiliente', async () => {
    mockCountArchived.mockResolvedValue({ error: 'fallo' })

    render(await ConsultasPage({ searchParams: Promise.resolve({}) }))

    expect(screen.queryByRole('link', { name: /ver archivo/i })).not.toBeInTheDocument()
  })
})
