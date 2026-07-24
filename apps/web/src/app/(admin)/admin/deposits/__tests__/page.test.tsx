import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminDepositsPage from '../page'
import { DepositActions } from '../DepositActions'
import { getPendingDeposits, processTransaction } from '@/app/actions/admin-wallet'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/app/actions/admin-wallet', () => ({
  getPendingDeposits: jest.fn(),
  processTransaction: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockGetPendingDeposits = getPendingDeposits as jest.MockedFunction<typeof getPendingDeposits>
const mockProcessTransaction = processTransaction as jest.MockedFunction<typeof processTransaction>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function mockStorageClient(signedUrl = 'https://storage.test/proof.jpg') {
  mockCreateClient.mockResolvedValue({
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(() => Promise.resolve({ data: { signedUrl } })),
      })),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

describe('AdminDepositsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStorageClient()
  })

  it('lista depositos pendientes con comprobante, observaciones y URLs firmadas', async () => {
    mockGetPendingDeposits.mockResolvedValue({
      deposits: [
        { id: 'dep-12345678', userName: 'ana', userBalance: 5000000, amount: 1500000, proof_url: 'proofs/dep.jpg', observations: 'Transferencia Bancolombia', created_at: '2026-05-25T10:00:00.000Z' },
        { id: 'dep-empty', userName: 'beto', userBalance: 0, amount: 500000, proof_url: null, observations: '', created_at: '2026-05-25T11:00:00.000Z' },
      ],
    })

    render(await AdminDepositsPage({}))

    expect(screen.getByRole('heading', { name: /depósitos pendientes/i })).toBeInTheDocument()
    expect(screen.getByText('@ana')).toBeInTheDocument()
    expect(screen.getByText('@beto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver original/i })).toHaveAttribute('href', 'https://storage.test/proof.jpg')
    expect(screen.getByAltText('Comprobante')).toHaveAttribute('src', 'https://storage.test/proof.jpg')
    expect(screen.getByText('"Transferencia Bancolombia"')).toBeInTheDocument()
    expect(screen.getByText('Sin comprobante')).toBeInTheDocument()
    expect(screen.getByText('Sin comentarios adicionales')).toBeInTheDocument()
  })

  it('muestra empty state y no solicita URLs si no hay depositos', async () => {
    mockGetPendingDeposits.mockResolvedValue({ deposits: [] })

    render(await AdminDepositsPage({}))

    expect(screen.getByText('Bandeja de entrada limpia')).toBeInTheDocument()
    expect(screen.getByText(/No hay solicitudes de depósito pendientes/)).toBeInTheDocument()
  })

  it('muestra error de carga sin construir URLs firmadas', async () => {
    mockGetPendingDeposits.mockResolvedValue({ error: 'RPC caida' })

    render(await AdminDepositsPage({}))

    expect(screen.getByText('Error al cargar depósitos: RPC caida')).toBeInTheDocument()
  })
})

describe('DepositActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
  })

  it('aprueba y rechaza una solicitud de deposito', async () => {
    mockProcessTransaction.mockResolvedValue({ success: true })

    render(<DepositActions depositId="dep-1" />)
    fireEvent.click(screen.getByRole('button', { name: /aprobar/i }))
    await waitFor(() => expect(mockProcessTransaction).toHaveBeenCalledWith('dep-1', 'completed'))

    fireEvent.click(screen.getByRole('button', { name: /rechazar/i }))
    await waitFor(() => expect(mockProcessTransaction).toHaveBeenCalledWith('dep-1', 'failed'))
  })

  it('muestra error de accion y error inesperado', async () => {
    mockProcessTransaction.mockResolvedValueOnce({ error: 'Sin permiso' }).mockRejectedValueOnce(new Error('network'))

    render(<DepositActions depositId="dep-1" />)
    fireEvent.click(screen.getByRole('button', { name: /aprobar/i }))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Sin permiso'))

    fireEvent.click(screen.getByRole('button', { name: /rechazar/i }))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error inesperado: network'))
  })
})
