import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TransactionModal } from '../TransactionModal'
import { createClient } from '@/utils/supabase/client'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

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
  })

  it('renderiza monto, estado, detalles y usa signed URL cuando existe proof_url', async () => {
    render(<TransactionModal transaction={baseTx} isOpen={true} onClose={jest.fn()} />)

    expect(screen.getByText(/detalles de operación/i)).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('$500'))).toBeInTheDocument()
    expect(screen.getByText(/operación exitosa/i)).toBeInTheDocument()
    expect(screen.getByText(/depósito de fondos/i)).toBeInTheDocument()
    expect(screen.getByText(/recarga por nequi/i)).toBeInTheDocument()
    expect(screen.getByText(/soporte enviado/i)).toBeInTheDocument()

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

  it('muestra placeholder de procesamiento cuando no hay URL resuelta aún', async () => {
    mockCreateSignedUrl.mockImplementation(() => new Promise(() => {}))

    render(<TransactionModal transaction={baseTx} isOpen={true} onClose={jest.fn()} />)

    expect(screen.getByText(/procesando imagen/i)).toBeInTheDocument()
  })

  it('permite cerrar desde backdrop y botón de cierre', () => {
    const onClose = jest.fn()
    const { container } = render(<TransactionModal transaction={baseTx} isOpen={true} onClose={onClose} />)

    const backdrop = Array.from(container.querySelectorAll('div')).find((element) =>
      element.className.includes('bg-black/80 backdrop-blur-md')
    ) as Element
    fireEvent.click(backdrop)
    fireEvent.click(screen.getByRole('button', { name: /cerrar detalles/i }))

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
