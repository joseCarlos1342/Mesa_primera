import { fireEvent, render, screen } from '@testing-library/react'

import { WalletContent } from '../WalletContent'

jest.mock('framer-motion', () => ({
  m: {
    section: ({ children, initial: _initial, animate: _animate, transition: _transition, whileHover: _whileHover, whileTap: _whileTap, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => <section {...props}>{children}</section>,
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, whileHover: _whileHover, whileTap: _whileTap, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('../TransactionModal', () => ({
  TransactionModal: ({ isOpen, transaction, onClose }: { isOpen: boolean; transaction: { id?: string } | null; onClose: () => void }) => (
    <div data-testid="transaction-modal">
      <span>open:{String(isOpen)}</span>
      <span>tx:{transaction?.id ?? 'none'}</span>
      <button type="button" onClick={onClose}>cerrar tx modal</button>
    </div>
  ),
}))

jest.mock('../TransferModal', () => ({
  TransferModal: ({ isOpen, currentBalance, onClose }: { isOpen: boolean; currentBalance: number; onClose: () => void }) => (
    <div data-testid="transfer-modal">
      <span>open:{String(isOpen)}</span>
      <span>balance:{currentBalance}</span>
      <button type="button" onClick={onClose}>cerrar transfer modal</button>
    </div>
  ),
}))

const wallet = { balance_cents: 275000 }
const transactions = [
  { id: 'w1', type: 'deposit', direction: 'credit', status: 'completed', amount_cents: 50000, created_at: '2025-01-01T10:00:00.000Z' },
  { id: 'w2', type: 'withdrawal', direction: 'debit', status: 'pending', amount_cents: 20000, created_at: '2025-01-02T10:00:00.000Z' },
  { id: 'w3', type: 'transfer', direction: 'credit', status: 'failed', amount_cents: 10000, created_at: '2025-01-03T10:00:00.000Z' },
]

describe('WalletContent', () => {
  it('renderiza saldo, packs de carga y acciones principales', () => {
    render(<WalletContent wallet={wallet} transactions={transactions} />)

    expect(screen.getByText(/saldo en cartera/i)).toBeInTheDocument()
    expect(screen.getByText('$2.750')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /retirar/i })).toHaveAttribute('href', '/wallet/withdraw')
    expect(screen.getByRole('button', { name: /transferir/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver todo/i })).toHaveAttribute('href', '/wallet/history')
    expect(screen.getByRole('link', { name: /otro monto manual/i })).toHaveAttribute('href', '/wallet/deposit')
    expect(screen.getByRole('link', { name: /pagas \$50.000/i })).toHaveAttribute('href', '/wallet/deposit?amount=50000')
    expect(screen.getByText('Popular')).toBeInTheDocument()
  })

  it('renderiza estado vacío cuando no hay movimientos', () => {
    render(<WalletContent wallet={{ balance_cents: 0 }} transactions={[]} />)

    expect(screen.getByText(/sin movimientos/i)).toBeInTheDocument()
  })

  it('abre el modal de transacción al hacer click en un movimiento', () => {
    render(<WalletContent wallet={wallet} transactions={transactions} />)

    fireEvent.click(screen.getByText('Depósito'))

    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('open:true')
    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('tx:w1')

    fireEvent.click(screen.getByRole('button', { name: /cerrar tx modal/i }))
    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('open:false')
  })

  it('abre y cierra el modal de transferencias con el balance actual', () => {
    render(<WalletContent wallet={wallet} transactions={transactions} />)

    fireEvent.click(screen.getByRole('button', { name: /transferir/i }))

    expect(screen.getByTestId('transfer-modal')).toHaveTextContent('open:true')
    expect(screen.getByTestId('transfer-modal')).toHaveTextContent('balance:275000')

    fireEvent.click(screen.getByRole('button', { name: /cerrar transfer modal/i }))
    expect(screen.getByTestId('transfer-modal')).toHaveTextContent('open:false')
  })

  it('renderiza etiquetas de tipos y estados de movimientos', () => {
    render(<WalletContent wallet={wallet} transactions={transactions} />)

    expect(screen.getByText('Depósito')).toBeInTheDocument()
    expect(screen.getByText('Retiro')).toBeInTheDocument()
    expect(screen.getByText('Transferencia Recibida')).toBeInTheDocument()
    expect(screen.getByText('Éxito')).toBeInTheDocument()
    expect(screen.getByText('Procesando')).toBeInTheDocument()
    expect(screen.getByText('Fallido')).toBeInTheDocument()
  })

  it('distingue variantes restantes de movimiento y usa cero para monto ausente', () => {
    render(
      <WalletContent
        wallet={wallet}
        transactions={[
          { id: 'refund', type: 'refund', direction: 'credit', status: 'completed', amount_cents: 2500, created_at: '2025-01-04T10:00:00.000Z' },
          { id: 'sent-transfer', type: 'transfer', direction: 'debit', status: 'pending', amount_cents: 1000, created_at: '2025-01-05T10:00:00.000Z' },
          { id: 'adjustment', type: 'admin_adjustment', direction: 'credit', status: 'completed', amount_cents: 0, created_at: '2025-01-06T10:00:00.000Z' },
          { id: 'unknown', type: 'bonus', direction: 'debit', status: 'failed', amount_cents: null, created_at: '2025-01-07T10:00:00.000Z' },
        ]}
      />,
    )

    expect(screen.getByText('Reembolso')).toBeInTheDocument()
    expect(screen.getByText('Transferencia Enviada')).toBeInTheDocument()
    expect(screen.getByText('Ajuste')).toBeInTheDocument()
    expect(screen.getByText('bonus')).toBeInTheDocument()
    expect(screen.getByText('-$0')).toBeInTheDocument()
  })
})
