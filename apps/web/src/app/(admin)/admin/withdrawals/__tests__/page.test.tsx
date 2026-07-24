import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminWithdrawalsPage from '../page'
import { WithdrawalActions } from '../WithdrawalActions'
import { getPendingWithdrawals } from '@/app/actions/withdrawals'
import { processTransaction } from '@/app/actions/admin-wallet'

jest.mock('@/app/actions/withdrawals', () => ({
  getPendingWithdrawals: jest.fn(),
}))

jest.mock('@/app/actions/admin-wallet', () => ({
  processTransaction: jest.fn(),
}))

const mockGetPendingWithdrawals = getPendingWithdrawals as jest.MockedFunction<typeof getPendingWithdrawals>
const mockProcessTransaction = processTransaction as jest.MockedFunction<typeof processTransaction>

describe('AdminWithdrawalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lista retiros pendientes con datos bancarios y acciones', async () => {
    mockGetPendingWithdrawals.mockResolvedValue({
      withdrawals: [
        { id: 'wit-12345678', userName: 'ana', userBalance: 7000000, amount: 2500000, bank_info: 'Banco Test 123', created_at: '2026-05-25T10:00:00.000Z' },
        { id: 'wit-empty', userName: 'beto', userBalance: 1000000, amount: 500000, bank_info: null, created_at: '2026-05-25T11:00:00.000Z' },
      ],
    })

    render(await AdminWithdrawalsPage({}))

    expect(screen.getByRole('heading', { name: /retiros pendientes/i })).toBeInTheDocument()
    expect(screen.getByText('@ana')).toBeInTheDocument()
    expect(screen.getByText('@beto')).toBeInTheDocument()
    expect(screen.getByText('Banco Test 123')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /procesar/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /anular/i })).toHaveLength(2)
  })

  it('muestra empty state sin retiros', async () => {
    mockGetPendingWithdrawals.mockResolvedValue({ withdrawals: [] })

    render(await AdminWithdrawalsPage({}))

    expect(screen.getByText('Sin solicitudes pendientes')).toBeInTheDocument()
    expect(screen.getByText(/Todas las transacciones han sido procesadas/)).toBeInTheDocument()
  })

  it('muestra error de carga de retiros', async () => {
    mockGetPendingWithdrawals.mockResolvedValue({ error: 'No autorizado' })

    render(await AdminWithdrawalsPage({}))

    expect(screen.getByText('Error al cargar retiros: No autorizado')).toBeInTheDocument()
  })
})

describe('WithdrawalActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
  })

  it('procesa y anula una solicitud de retiro', async () => {
    mockProcessTransaction.mockResolvedValue({ success: true })

    render(<WithdrawalActions withdrawalId="wit-1" />)
    fireEvent.click(screen.getByRole('button', { name: /procesar/i }))
    await waitFor(() => expect(mockProcessTransaction).toHaveBeenCalledWith('wit-1', 'completed'))

    fireEvent.click(screen.getByRole('button', { name: /anular/i }))
    await waitFor(() => expect(mockProcessTransaction).toHaveBeenCalledWith('wit-1', 'failed'))
  })

  it('muestra error de accion y error inesperado', async () => {
    mockProcessTransaction.mockResolvedValueOnce({ error: 'Solicitud vencida' }).mockRejectedValueOnce(new Error('timeout'))

    render(<WithdrawalActions withdrawalId="wit-1" />)
    fireEvent.click(screen.getByRole('button', { name: /procesar/i }))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Solicitud vencida'))

    fireEvent.click(screen.getByRole('button', { name: /anular/i }))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error inesperado: timeout'))
  })
})
