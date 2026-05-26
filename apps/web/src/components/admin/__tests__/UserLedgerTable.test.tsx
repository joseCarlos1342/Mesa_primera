import { fireEvent, render, screen } from '@testing-library/react'
import { UserLedgerTable } from '../UserLedgerTable'

const entries = [
  {
    id: 'entry-1',
    user_id: 'user-1',
    amount_cents: 250000,
    direction: 'credit' as const,
    balance_after_cents: 400000,
    type: 'deposit',
    status: 'completed',
    reference_id: 'deposit-reference-123456',
    description: 'Deposito aprobado',
    metadata: {},
    created_at: '2026-05-25T10:00:00.000Z',
  },
  {
    id: 'entry-2',
    user_id: 'user-1',
    amount_cents: 50000,
    direction: 'debit' as const,
    balance_after_cents: 350000,
    type: 'rake',
    status: 'pending',
    reference_id: null,
    description: 'Comision de sala',
    metadata: {
      room_id: 'room-abcdef-123456',
      table_name: 'Mesa VIP',
      players_present: [{ nickname: 'Ana' }, { odisplayName: 'Beto' }],
    },
    created_at: '2026-05-25T11:00:00.000Z',
  },
  {
    id: 'entry-3',
    user_id: 'user-1',
    amount_cents: 75000,
    direction: 'debit' as const,
    balance_after_cents: 275000,
    type: 'withdrawal',
    status: 'failed',
    reference_id: null,
    description: 'Retiro rechazado',
    metadata: {},
    created_at: '2026-05-25T12:00:00.000Z',
  },
]

describe('UserLedgerTable', () => {
  it('renderiza historial con conceptos, sala/ref y jugadores presentes', () => {
    render(<UserLedgerTable entries={entries} />)

    expect(screen.getByText('Historial (3 de 3)')).toBeInTheDocument()
    expect(screen.getAllByText('Depósito').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Comisión').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Retiro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mesa VIP').length).toBeGreaterThan(0)
    expect(screen.getByText('Ana, Beto')).toBeInTheDocument()
    expect(screen.getAllByText(/deposit-refe/).length).toBeGreaterThan(0)
  })

  it('filtra por tipo, direccion y busqueda en metadata o descripcion', () => {
    render(<UserLedgerTable entries={entries} />)

    const typeSelect = screen.getByDisplayValue('Todos los tipos')
    fireEvent.change(typeSelect, { target: { value: 'rake' } })

    expect(screen.getByText('Historial (1 de 3)')).toBeInTheDocument()
    expect(screen.getAllByText('Comisión').length).toBeGreaterThan(0)
    expect(screen.queryByText('Deposito aprobado')).not.toBeInTheDocument()

    fireEvent.change(typeSelect, { target: { value: 'all' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créditos' }))
    expect(screen.getByText('Historial (1 de 3)')).toBeInTheDocument()
    expect(screen.getAllByText('Depósito').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Débitos' }))
    expect(screen.getByText('Historial (2 de 3)')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar en descripción...'), { target: { value: 'vip' } })
    expect(screen.getByText('Historial (1 de 3)')).toBeInTheDocument()
    expect(screen.getAllByText('Mesa VIP').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText('Buscar en descripción...'), { target: { value: 'sin match' } })
    expect(screen.getAllByText('No hay registros que coincidan con los filtros.')).toHaveLength(2)
  })
})
