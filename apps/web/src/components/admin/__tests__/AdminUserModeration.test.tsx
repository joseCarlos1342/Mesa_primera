import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { UserBalanceControl } from '../UserBalanceControl'
import { UserBanControl } from '../UserBanControl'
import { adjustUserBalance } from '@/app/actions/admin-users'
import { createSanction, getActiveSanctions, revokeSanction, type SanctionRecord } from '@/app/actions/admin-sanctions'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/app/actions/admin-users', () => ({
  adjustUserBalance: jest.fn(),
}))

jest.mock('@/app/actions/admin-sanctions', () => ({
  createSanction: jest.fn(),
  getActiveSanctions: jest.fn(),
  revokeSanction: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockAdjustUserBalance = adjustUserBalance as jest.MockedFunction<typeof adjustUserBalance>
const mockCreateSanction = createSanction as jest.MockedFunction<typeof createSanction>
const mockGetActiveSanctions = getActiveSanctions as jest.MockedFunction<typeof getActiveSanctions>
const mockRevokeSanction = revokeSanction as jest.MockedFunction<typeof revokeSanction>

const sanction: SanctionRecord = {
  id: 'sanction-1',
  user_id: 'user-1',
  sanction_type: 'game_suspension',
  reason: 'Abuso de chat',
  applied_by: 'admin-1',
  source_room_id: null,
  starts_at: '2026-05-25T00:00:00.000Z',
  expires_at: '2026-06-01T00:00:00.000Z',
  revoked_at: null,
  revoked_by: null,
  metadata: {},
  created_at: '2026-05-25T00:00:00.000Z',
}

describe('admin user moderation controls', () => {
  const refresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    window.confirm = jest.fn(() => true)
    mockUseRouter.mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>)
    mockAdjustUserBalance.mockResolvedValue({ success: true, balance_after: 200000 })
    mockCreateSanction.mockResolvedValue({ success: true, sanction })
    mockGetActiveSanctions.mockResolvedValue([sanction])
    mockRevokeSanction.mockResolvedValue({ success: true, sanction })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    document.body.style.overflow = ''
  })

  it('abre ajuste de saldo, valida monto/motivo y acredita con ledger action', async () => {
    render(<UserBalanceControl userId="user-1" userName="Ana" currentBalance={150000} layout="mobile-split" />)

    fireEvent.click(screen.getByRole('button', { name: /saldo/i }))

    expect(await screen.findByText('Ajustar Saldo')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: /sumar/i }))
    expect(screen.getByText('Ingresa un monto válido mayor a $0')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '2500' } })
    fireEvent.click(screen.getByRole('button', { name: /sumar/i }))
    expect(screen.getByText('El motivo del ajuste es obligatorio')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Ej: Corrección por error en mesa #42'), {
      target: { value: 'Correccion soporte' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sumar/i }))

    await waitFor(() => expect(mockAdjustUserBalance).toHaveBeenCalledWith('user-1', 250000, 'Correccion soporte'))
    expect(await screen.findByText(/Ajuste de \+.*2.500 aplicado correctamente/)).toBeInTheDocument()
  })

  it('debita saldo y muestra error de ajuste', async () => {
    mockAdjustUserBalance.mockRejectedValueOnce(new Error('Saldo insuficiente'))
    render(<UserBalanceControl userId="user-1" userName="Ana" currentBalance={150000} />)

    fireEvent.click(screen.getByTitle('Ajustar Saldo'))
    fireEvent.change(await screen.findByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: Corrección por error en mesa #42'), {
      target: { value: 'Debito manual' },
    })
    fireEvent.click(screen.getByRole('button', { name: /restar/i }))

    await waitFor(() => expect(mockAdjustUserBalance).toHaveBeenCalledWith('user-1', -100000, 'Debito manual'))
    expect(screen.getByText('Saldo insuficiente')).toBeInTheDocument()
  })

  it('lista sanciones activas y permite revocar una sancion', async () => {
    render(<UserBanControl userId="user-1" userName="Ana" isBanned={false} />)

    fireEvent.click(screen.getByRole('button', { name: /sanciones/i }))

    expect(await screen.findByText('Suspensión de Juego')).toBeInTheDocument()
    expect(screen.getByText('Abuso de chat')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /revocar/i }))

    await waitFor(() => expect(mockRevokeSanction).toHaveBeenCalledWith('sanction-1'))
    expect(refresh).toHaveBeenCalled()
    expect(screen.queryByText('Abuso de chat')).not.toBeInTheDocument()
  })

  it('crea sancion temporal y luego muestra resultado exitoso', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-25T00:00:00.000Z').getTime())
    mockGetActiveSanctions
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sanction])

    render(<UserBanControl userId="user-1" userName="Ana" isBanned={false} layout="mobile-split" />)

    fireEvent.click(screen.getByRole('button', { name: /sancionar/i }))
    expect(await screen.findByText('Tipo de sanción')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('7'), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'months' } })
    fireEvent.change(screen.getByPlaceholderText('Describe el motivo de la sanción...'), {
      target: { value: 'Conducta reiterada' },
    })
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => expect(mockCreateSanction).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      sanctionType: 'game_suspension',
      reason: 'Conducta reiterada',
      expiresAt: '2026-07-24T00:00:00.000Z',
    })))
    expect(await screen.findByText('Sanción aplicada exitosamente')).toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })

  it('permite cerrar el panel y crear sancion temporal por dias', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-25T00:00:00.000Z').getTime())
    mockGetActiveSanctions
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sanction])

    render(<UserBanControl userId="user-1" userName="Ana" isBanned={false} />)

    fireEvent.click(screen.getAllByRole('button', { name: /^Sancionar$/i })[0])
    expect(await screen.findByText('Tipo de sanción')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /^Sanciones$/i })[1])
    expect(await screen.findByText('Sin sanciones activas')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /^Sancionar$/i })[1])
    expect(await screen.findByText('Tipo de sanción')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByText('Tipo de sanción')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /^Sancionar$/i })[0])
    expect(await screen.findByText('Tipo de sanción')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('7'), { target: { value: '3' } })
    fireEvent.change(screen.getByPlaceholderText('Describe el motivo de la sanción...'), {
      target: { value: 'Abandono reiterado' },
    })
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => expect(mockCreateSanction).toHaveBeenCalledWith(expect.objectContaining({
      sanctionType: 'game_suspension',
      reason: 'Abandono reiterado',
      expiresAt: '2026-05-28T00:00:00.000Z',
    })))
    expect(await screen.findByText('Sanción aplicada exitosamente')).toBeInTheDocument()
  })

  it('muestra error visible cuando falla revocar una sancion', async () => {
    mockRevokeSanction.mockRejectedValueOnce(new Error('No autorizada'))
    render(<UserBanControl userId="user-1" userName="Ana" isBanned={false} />)

    fireEvent.click(screen.getByRole('button', { name: /sanciones/i }))

    expect(await screen.findByText('Abuso de chat')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /revocar/i }))

    await waitFor(() => expect(mockRevokeSanction).toHaveBeenCalledWith('sanction-1'))
    expect(await screen.findByText('Error: No autorizada')).toBeInTheDocument()
    expect(screen.getByText('Abuso de chat')).toBeInTheDocument()
  })

  it('crea veto permanente sin expiracion y muestra errores', async () => {
    mockCreateSanction.mockRejectedValueOnce(new Error('Duplicada'))
    render(<UserBanControl userId="user-1" userName="Ana" isBanned={false} />)

    fireEvent.click(screen.getAllByRole('button', { name: /^Sancionar$/i })[0])
    fireEvent.click(await screen.findByText('Veto Permanente'))
    expect(screen.queryByDisplayValue('7')).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Describe el motivo de la sanción...'), {
      target: { value: 'Fraude confirmado' },
    })
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => expect(mockCreateSanction).toHaveBeenCalledWith(expect.objectContaining({
      sanctionType: 'permanent_ban',
      reason: 'Fraude confirmado',
      expiresAt: undefined,
    })))
    expect(screen.getByText('Error: Duplicada')).toBeInTheDocument()
  })
})
