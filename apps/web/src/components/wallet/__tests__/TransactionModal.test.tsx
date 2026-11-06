import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TransactionModal } from '../TransactionModal'
import { createClient } from '@/utils/supabase/client'

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockCreateSignedUrl = jest.fn()
const mockGetPublicUrl = jest.fn()

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function buildSupabase() {
  return {
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  }
}

const baseTx = {
  id: 'tx-1',
  type: 'deposit',
  direction: 'credit',
  status: 'completed',
  amount_cents: 50000,
  balance_after_cents: 300000,
  created_at: '2025-01-01T10:00:00.000Z',
  description: 'Recarga por Nequi',
  observations: 'Soporte enviado',
  proof_url: 'proofs/comprobante.png',
}

describe('TransactionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockReturnValue(buildSupabase() as never)
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.test/proof.png' }, error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://public.test/proof.png' } })
  })

  it('no renderiza nada si transaction es null', () => {
    const { container } = render(<TransactionModal transaction={null} isOpen={true} onClose={jest.fn()} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza monto, estado, detalles y usa signed URL cuando existe proof_url', async () => {
    render(<TransactionModal transaction={baseTx} isOpen={true} onClose={jest.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Carga de saldo' })).toBeInTheDocument()
    expect(screen.getByText('Completado')).toBeInTheDocument()
    const monies = screen.getAllByTestId('money')
    expect(monies.some((m) => m.textContent === '+$500')).toBe(true)
    // Canal de depósito
    expect(screen.getByText('Transferencia Nequi')).toBeInTheDocument()
    expect(screen.getByText('Saldo después')).toBeInTheDocument()
    expect(screen.getByText('Recarga por Nequi')).toBeInTheDocument()
    expect(screen.getByText('Soporte enviado')).toBeInTheDocument()
    expect(screen.getByText('tx-1')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('proofs/comprobante.png', 3600)
      expect(screen.getByRole('img', { name: /comprobante/i })).toHaveAttribute('src', 'https://signed.test/proof.png')
    })
  })

  it('hace fallback a public URL si createSignedUrl falla', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'forbidden' } })

    render(<TransactionModal transaction={baseTx} isOpen={true} onClose={jest.fn()} />)

    await waitFor(() => {
      expect(mockGetPublicUrl).toHaveBeenCalledWith('proofs/comprobante.png')
      expect(screen.getByRole('img', { name: /comprobante/i })).toHaveAttribute('src', 'https://public.test/proof.png')
    })
  })

  it('hace fallback a public URL si el signed URL viene vacío aunque no haya error', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: {}, error: null })

    render(<TransactionModal transaction={baseTx} isOpen={true} onClose={jest.fn()} />)

    await waitFor(() => {
      expect(mockGetPublicUrl).toHaveBeenCalledWith('proofs/comprobante.png')
      expect(screen.getByRole('link', { name: /ver completo/i })).toHaveAttribute('href', 'https://public.test/proof.png')
    })
  })

  it('muestra placeholder de carga cuando no hay URL resuelta aún', async () => {
    mockCreateSignedUrl.mockImplementation(() => new Promise(() => {}))

    render(<TransactionModal transaction={baseTx} isOpen={true} onClose={jest.fn()} />)

    expect(screen.getByText(/cargando comprobante/i)).toBeInTheDocument()
  })

  it('permite cerrar desde el backdrop y el botón de cierre', async () => {
    const onClose = jest.fn()
    render(<TransactionModal transaction={baseTx} isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    fireEvent.click(screen.getByRole('button', { name: /cerrar detalle/i }))

    expect(onClose).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(mockCreateSignedUrl).toHaveBeenCalledWith('proofs/comprobante.png', 3600))
  })

  it('no muestra contenido si el modal está cerrado aunque exista transacción', async () => {
    render(<TransactionModal transaction={baseTx} isOpen={false} onClose={jest.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(mockCreateSignedUrl).toHaveBeenCalledWith('proofs/comprobante.png', 3600))
  })

  it('representa retiros pendientes como débito sin comprobante de depósito', async () => {
    render(
      <TransactionModal
        transaction={{
          ...baseTx,
          id: 'withdrawal-1',
          type: 'withdrawal',
          direction: 'debit',
          status: 'pending',
          amount_cents: 125000,
          description: '',
          observations: '',
          proof_url: null,
        }}
        isOpen={true}
        onClose={jest.fn()}
      />,
    )

    const monies = screen.getAllByTestId('money')
    expect(monies.some((m) => m.textContent === '\u2212$1.250')).toBe(true)
    expect(screen.getByText('En revisión')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Retiro' })).toBeInTheDocument()
    expect(screen.getByText('Retiro a cuenta')).toBeInTheDocument()
    expect(screen.queryByText('Comprobante')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(mockCreateSignedUrl).not.toHaveBeenCalled()
      expect(mockGetPublicUrl).not.toHaveBeenCalled()
    })
  })

  it('usa canales y etiquetas correctas para transferencias, ajustes y tipos desconocidos', () => {
    const { rerender } = render(
      <TransactionModal
        transaction={{
          ...baseTx,
          id: 'transfer-1',
          type: 'transfer',
          direction: undefined,
          status: 'failed',
          proof_url: null,
          balance_after_cents: null,
        }}
        isOpen={true}
        onClose={jest.fn()}
      />,
    )

    const monies = screen.getAllByTestId('money')
    expect(monies.some((m) => m.textContent === '\u2212$500')).toBe(true)
    expect(screen.getByText('Rechazado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transferencia enviada' })).toBeInTheDocument()
    expect(screen.getByText('Entre jugadores')).toBeInTheDocument()
    // Sin balance_after_cents no se muestra la fila "Saldo después".
    expect(screen.queryByText('Saldo después')).not.toBeInTheDocument()

    rerender(
      <TransactionModal
        transaction={{
          ...baseTx,
          id: 'adjustment-1',
          type: 'admin_adjustment',
          direction: 'credit',
          status: 'completed',
          proof_url: null,
        }}
        isOpen={true}
        onClose={jest.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Ajuste de saldo' })).toBeInTheDocument()
    expect(screen.getByText('Sistema')).toBeInTheDocument()

    rerender(
      <TransactionModal
        transaction={{
          ...baseTx,
          id: 'custom-1',
          type: 'bonus_manual',
          direction: undefined,
          proof_url: null,
          description: null,
          observations: null,
        }}
        isOpen={true}
        onClose={jest.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'bonus_manual' })).toBeInTheDocument()
  })
})
