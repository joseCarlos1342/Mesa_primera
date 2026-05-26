import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdminGlobalSearch } from '../AdminGlobalSearch'
import { AuditFilters } from '../AuditFilters'
import { CleanupStaleGamesButton } from '../CleanupStaleGamesButton'
import { LedgerRealtimeRefresh } from '../LedgerRealtimeRefresh'
import { cleanupStaleGames } from '@/app/actions/admin-tables'
import { exportAuditLog } from '@/app/actions/admin-audit-export'
import { createClient } from '@/utils/supabase/client'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/app/actions/admin-tables', () => ({
  cleanupStaleGames: jest.fn(),
}))

jest.mock('@/app/actions/admin-audit-export', () => ({
  exportAuditLog: jest.fn(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>
const mockCleanupStaleGames = cleanupStaleGames as jest.MockedFunction<typeof cleanupStaleGames>
const mockExportAuditLog = exportAuditLog as jest.MockedFunction<typeof exportAuditLog>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('admin filters, realtime and cleanup', () => {
  const push = jest.fn()
  const refresh = jest.fn()
  const removeChannel = jest.fn()
  const on = jest.fn()
  const subscribe = jest.fn(() => 'channel-ref')

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    window.confirm = jest.fn(() => true)
    window.alert = jest.fn()
    mockUseRouter.mockReturnValue({ push, refresh } as unknown as ReturnType<typeof useRouter>)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('action=login&context=wallet&dateFrom=2026-05-01T00%3A00%3A00Z') as unknown as ReturnType<typeof useSearchParams>)
    mockCleanupStaleGames.mockResolvedValue({ success: true, cleaned: 3 })
    mockExportAuditLog.mockResolvedValue('id,action\n1,login')
    on.mockReturnValue({ on, subscribe })
    mockCreateClient.mockReturnValue({
      channel: jest.fn(() => ({ on, subscribe })),
      removeChannel,
    } as unknown as ReturnType<typeof createClient>)
    URL.createObjectURL = jest.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('envia busqueda global admin solo con query no vacia', () => {
    render(<AdminGlobalSearch />)

    const input = screen.getByLabelText('Búsqueda global admin')
    fireEvent.change(input, { target: { value: '  user 123  ' } })
    fireEvent.submit(input.closest('form')!)

    expect(push).toHaveBeenCalledWith('/admin/consultas?q=user%20123')

    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form')!)

    expect(push).toHaveBeenCalledTimes(1)
  })

  it('limpia partidas huerfanas confirmadas y muestra error si falla', async () => {
    const { rerender } = render(<CleanupStaleGamesButton />)

    fireEvent.click(screen.getByRole('button', { name: /limpiar huérfanas/i }))

    await waitFor(() => expect(mockCleanupStaleGames).toHaveBeenCalledTimes(1))
    expect(window.alert).toHaveBeenCalledWith('Limpieza completada: 3 partidas cerradas.')
    expect(refresh).toHaveBeenCalled()

    mockCleanupStaleGames.mockRejectedValueOnce(new Error('Sin permisos'))
    rerender(<CleanupStaleGamesButton />)
    fireEvent.click(screen.getByRole('button', { name: /limpiar huérfanas/i }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Sin permisos'))
  })

  it('aplica filtros de auditoria, limpia y exporta CSV/JSON', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<AuditFilters />)

    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('ej: broadcast_sent'), { target: { value: 'wallet_adjusted' } })
    expect(push).toHaveBeenCalledWith('?action=wallet_adjusted&context=wallet&dateFrom=2026-05-01T00%3A00%3A00Z')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'support' } })
    expect(push).toHaveBeenCalledWith('?action=login&context=support&dateFrom=2026-05-01T00%3A00%3A00Z')

    const dateInputs = document.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[1], { target: { value: '2026-05-20' } })
    expect(push).toHaveBeenCalledWith(expect.stringContaining('dateTo=2026-05-20T23%3A59%3A59Z'))

    fireEvent.click(screen.getByRole('button', { name: /limpiar/i }))
    expect(push).toHaveBeenCalledWith('?')

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    await waitFor(() => expect(mockExportAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'login',
      context: 'wallet',
      dateFrom: '2026-05-01T00:00:00Z',
      limit: 5000,
    }), 'csv'))
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }))
    await waitFor(() => expect(mockExportAuditLog).toHaveBeenCalledWith(expect.any(Object), 'json'))
  })

  it('suscribe realtime ledger, debouncea refresh y limpia channel/timer', () => {
    jest.useFakeTimers()
    const { unmount } = render(<LedgerRealtimeRefresh />)

    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ledger' },
      expect.any(Function),
    )
    const handler = on.mock.calls[0][2]

    act(() => {
      handler()
      handler()
      jest.advanceTimersByTime(1999)
    })
    expect(refresh).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(refresh).toHaveBeenCalledTimes(1)

    unmount()
    expect(removeChannel).toHaveBeenCalledWith('channel-ref')
  })
})
