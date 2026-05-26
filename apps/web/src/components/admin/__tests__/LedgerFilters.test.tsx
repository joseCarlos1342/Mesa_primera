import { fireEvent, render, screen } from '@testing-library/react'
import { LedgerTransactionsFilter, LedgerUsersFilter } from '../LedgerFilters'

const users = [
  {
    id: 'user-ana-1234567890',
    display_name: 'Ana Rivera',
    username: 'anar',
    balance: 150000,
    total_credits: 300000,
    total_debits: 150000,
    last_activity: '2026-05-25T10:00:00.000Z',
  },
  {
    id: 'user-beto-1234567890',
    display_name: 'Beto Mesa',
    username: null,
    balance: -50000,
    total_credits: 100000,
    total_debits: 150000,
    last_activity: null,
  },
]

const entries = [
  {
    id: 'entry-1',
    user_id: 'user-ana-1234567890',
    amount_cents: 250000,
    direction: 'credit' as const,
    balance_after_cents: 400000,
    type: 'deposit',
    status: 'completed',
    reference_id: 'ref-1',
    description: 'Deposito manual',
    metadata: {},
    created_at: '2026-05-25T10:00:00.000Z',
    user: { display_name: 'Ana Rivera' },
  },
  {
    id: 'entry-2',
    user_id: null,
    amount_cents: 50000,
    direction: 'debit' as const,
    balance_after_cents: 350000,
    type: 'rake',
    status: 'pending',
    reference_id: null,
    description: 'Comision mesa final',
    metadata: {},
    created_at: '2026-05-25T11:00:00.000Z',
    user: null,
  },
  {
    id: 'entry-3',
    user_id: 'user-beto-1234567890',
    amount_cents: 75000,
    direction: 'debit' as const,
    balance_after_cents: -50000,
    type: 'withdrawal',
    status: 'failed',
    reference_id: 'ref-3',
    description: 'Retiro rechazado',
    metadata: {},
    created_at: '2026-05-25T12:00:00.000Z',
    user: { display_name: 'Beto Mesa' },
  },
]

describe('Ledger filters', () => {
  it('filtra usuarios por nombre, username e id y recalcula total visible', () => {
    render(<LedgerUsersFilter users={users} />)

    expect(screen.getByText('(2)')).toBeInTheDocument()
    expect(screen.getAllByText('Ana Rivera').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Beto Mesa').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /desglose/i })).toHaveLength(4)

    fireEvent.change(screen.getByPlaceholderText('Buscar jugador...'), { target: { value: 'anar' } })

    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(screen.getAllByText('Ana Rivera').length).toBeGreaterThan(0)
    expect(screen.queryByText('Beto Mesa')).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar jugador...'), { target: { value: 'sin-match' } })

    expect(screen.getAllByText('No se encontraron jugadores.')).toHaveLength(2)
  })

  it('filtra transacciones por tipo, direccion y busqueda textual', () => {
    render(<LedgerTransactionsFilter entries={entries} />)

    expect(screen.getByText('Transacciones (3)')).toBeInTheDocument()
    expect(screen.getAllByText('Ana Rivera').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SISTEMA / BÓVEDA').length).toBeGreaterThan(0)

    const typeSelect = screen.getByDisplayValue('Todos los tipos')
    fireEvent.change(typeSelect, { target: { value: 'rake' } })

    expect(screen.getByText('Transacciones (1)')).toBeInTheDocument()
    expect(screen.getAllByText(/RAKE|rake/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Ana Rivera')).not.toBeInTheDocument()

    fireEvent.change(typeSelect, { target: { value: 'all' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créditos' }))

    expect(screen.getByText('Transacciones (1)')).toBeInTheDocument()
    expect(screen.getAllByText('Ana Rivera').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Débitos' }))
    expect(screen.getByText('Transacciones (2)')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'rechazado' } })
    expect(screen.getByText('Transacciones (1)')).toBeInTheDocument()
    expect(screen.getAllByText('Beto Mesa').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'no existe' } })
    expect(screen.getAllByText('No hay registros que coincidan con los filtros.')).toHaveLength(2)
  })
})
