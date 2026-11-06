import { fireEvent, render, screen } from '@testing-library/react'

import {
  formatTxDate,
  isCredit,
  transactionIcon,
  transactionLabel,
  TransactionRow,
  type PlayerTransaction,
} from '../transactions'

const base: PlayerTransaction = {
  id: 'tx',
  type: 'deposit',
  amount_cents: 50000,
  status: 'completed',
  created_at: '2025-01-01T10:00:00.000Z',
}

describe('isCredit', () => {
  it('respeta direction explícita', () => {
    expect(isCredit({ type: 'withdrawal', direction: 'credit' })).toBe(true)
    expect(isCredit({ type: 'deposit', direction: 'debit' })).toBe(false)
  })

  it('infiere por tipo cuando no hay direction', () => {
    expect(isCredit({ type: 'deposit' })).toBe(true)
    expect(isCredit({ type: 'refund' })).toBe(true)
    expect(isCredit({ type: 'win' })).toBe(true)
    expect(isCredit({ type: 'bonus' })).toBe(true)
    expect(isCredit({ type: 'withdrawal' })).toBe(false)
    expect(isCredit({ type: 'bet' })).toBe(false)
  })
})

describe('transactionLabel', () => {
  it('etiqueta cada tipo conocido', () => {
    expect(transactionLabel({ type: 'deposit' })).toBe('Carga de saldo')
    expect(transactionLabel({ type: 'withdrawal' })).toBe('Retiro')
    expect(transactionLabel({ type: 'refund' })).toBe('Reembolso')
    expect(transactionLabel({ type: 'transfer', direction: 'credit' })).toBe('Transferencia recibida')
    expect(transactionLabel({ type: 'transfer', direction: 'debit' })).toBe('Transferencia enviada')
    expect(transactionLabel({ type: 'adjustment' })).toBe('Ajuste de saldo')
    expect(transactionLabel({ type: 'admin_adjustment' })).toBe('Ajuste de saldo')
    expect(transactionLabel({ type: 'bonus' })).toBe('Bono')
    expect(transactionLabel({ type: 'win' })).toBe('Ganancia en mesa')
    expect(transactionLabel({ type: 'bet' })).toBe('Apuesta')
    expect(transactionLabel({ type: 'rake' })).toBe('Comisión')
  })

  it('usa el tipo como etiqueta cuando es desconocido', () => {
    expect(transactionLabel({ type: 'misterioso' })).toBe('misterioso')
  })
})

describe('transactionIcon', () => {
  it('devuelve un componente para cada tipo (incluye ramas de transfer)', () => {
    for (const type of ['deposit', 'withdrawal', 'refund', 'bonus', 'win', 'bet', 'rake', 'otro']) {
      expect(typeof transactionIcon(type, false)).toBe('object')
    }
    expect(transactionIcon('transfer', true)).not.toBe(transactionIcon('transfer', false))
  })
})

describe('formatTxDate', () => {
  it('devuelve cadena vacía ante fecha inválida', () => {
    expect(formatTxDate('no-es-fecha')).toBe('')
  })

  it('formatea una fecha válida con separador', () => {
    expect(formatTxDate('2025-01-01T10:00:00.000Z')).toContain('·')
  })
})

describe('TransactionRow', () => {
  it('muestra etiqueta, monto de crédito y oculta estado si está completado', () => {
    render(
      <ul>
        <TransactionRow tx={{ ...base, type: 'deposit', amount_cents: 50000, status: 'completed' }} />
      </ul>,
    )
    expect(screen.getByText('Carga de saldo')).toBeInTheDocument()
    expect(screen.getByTestId('money')).toHaveTextContent('+$500')
    expect(screen.queryByText('Completado')).not.toBeInTheDocument()
  })

  it('muestra StatusTag cuando el movimiento está pendiente y dispara onSelect', () => {
    const onSelect = jest.fn()
    render(
      <ul>
        <TransactionRow
          tx={{ ...base, id: 'p1', type: 'withdrawal', direction: 'debit', amount_cents: 20000, status: 'pending' }}
          onSelect={onSelect}
        />
      </ul>,
    )
    expect(screen.getByText('Retiro')).toBeInTheDocument()
    expect(screen.getByText('En revisión')).toBeInTheDocument()
    expect(screen.getByTestId('money')).toHaveTextContent('\u2212$200')
    fireEvent.click(screen.getByRole('button', { name: /retiro/i }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('marca el tono de peligro para movimientos rechazados', () => {
    render(
      <ul>
        <TransactionRow tx={{ ...base, id: 'f1', type: 'transfer', direction: 'debit', status: 'failed' }} />
      </ul>,
    )
    expect(screen.getByText('Transferencia enviada')).toBeInTheDocument()
    expect(screen.getByText('Rechazado')).toBeInTheDocument()
  })
})
