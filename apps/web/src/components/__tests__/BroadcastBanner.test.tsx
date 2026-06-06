import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { BroadcastBanner } from '../BroadcastBanner'
import { createClient } from '@/utils/supabase/client'

jest.mock('gsap', () => ({
  gsap: {
    set: jest.fn(),
    to: jest.fn((_: unknown, config?: { onComplete?: () => void }) => config?.onComplete?.()),
    fromTo: jest.fn(),
  },
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const limitMock = jest.fn()
const orderMock = jest.fn()
const isMock = jest.fn()
const gteMock = jest.fn()
const notMock = jest.fn()
const eqMock = jest.fn()
const selectMock = jest.fn()
const fromMock = jest.fn()
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function setupSupabase(data: any[] = []) {
  eqMock.mockReturnValue({ not: notMock })
  notMock.mockReturnValue({ gte: gteMock })
  gteMock.mockReturnValue({ is: isMock })
  isMock.mockReturnValue({ order: orderMock })
  orderMock.mockReturnValue({ limit: limitMock })
  limitMock.mockResolvedValue({ data })
  selectMock.mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValue({ select: selectMock })
  mockCreateClient.mockReturnValue({ from: fromMock } as never)
}

describe('BroadcastBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  it('renderiza anuncio recuperado desde notifications y permite cerrarlo', async () => {
    setupSupabase([
      {
        broadcast_id: 'b1',
        type: 'system_announcement',
        title: 'Servidor activo',
        body: 'Mesa abierta para todos',
        created_at: '2025-01-01T10:00:00.000Z',
      },
    ])

    render(<BroadcastBanner userId="user-1" />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/servidor activo/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cerrar anuncio/i }))

    await waitFor(() => {
      expect(sessionStorage.getItem('dismissed-broadcasts')).toContain('b1')
    })
  })

  it('agrega un broadcast por evento socket-notification', async () => {
    setupSupabase([])
    render(<BroadcastBanner userId="user-1" />)

    fireEvent(window, new CustomEvent('socket-notification', {
      detail: {
        broadcastId: 'b2',
        type: 'promo',
        title: 'Promo flash',
        body: 'Fichas extra hoy',
        createdAt: '2025-01-01T10:00:00.000Z',
      },
    }))

    expect(await screen.findByText(/promo flash/i)).toBeInTheDocument()
    expect(screen.getByText(/fichas extra hoy/i)).toBeInTheDocument()
  })

  it('ignora eventos inválidos y no duplica broadcasts existentes', async () => {
    setupSupabase([])
    render(<BroadcastBanner userId="user-1" />)

    fireEvent(window, new CustomEvent('socket-notification', { detail: { title: 'Sin id' } }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    const event = new CustomEvent('socket-notification', {
      detail: {
        broadcastId: 'dedupe-1',
        type: 'maintenance',
        title: 'Mantenimiento breve',
        body: 'Volvemos pronto',
        createdAt: '2025-01-01T10:00:00.000Z',
      },
    })
    fireEvent(window, event)
    fireEvent(window, event)

    expect(await screen.findByText(/mantenimiento breve/i)).toBeInTheDocument()
    expect(screen.getAllByText(/mantenimiento breve/i)).toHaveLength(1)
    expect(screen.getByText('MANTENIMIENTO')).toBeInTheDocument()
  })

  it('respeta broadcasts ya descartados en sessionStorage aunque venga JSON inválido', async () => {
    sessionStorage.setItem('dismissed-broadcasts', 'not-json')
    setupSupabase([
      {
        broadcast_id: 'stored-1',
        type: 'security',
        title: 'Alerta de seguridad',
        body: 'Revisa tu sesión',
        created_at: '2025-01-01T10:00:00.000Z',
      },
    ])

    render(<BroadcastBanner userId="user-1" />)
    expect(await screen.findByText(/alerta de seguridad/i)).toBeInTheDocument()
    expect(screen.getByText('SEGURIDAD')).toBeInTheDocument()

    sessionStorage.setItem('dismissed-broadcasts', JSON.stringify(['stored-2']))
    setupSupabase([
      {
        broadcast_id: 'stored-2',
        type: 'promo',
        title: 'No visible',
        body: 'Ya cerrado',
        created_at: '2025-01-01T10:00:00.000Z',
      },
    ])
    render(<BroadcastBanner userId="user-2" />)

    await waitFor(() => expect(limitMock).toHaveBeenCalled())
    expect(screen.queryByText(/no visible/i)).not.toBeInTheDocument()
  })

  it('usa config default para tipos desconocidos y auto-descarta', async () => {
    setupSupabase([])
    render(<BroadcastBanner userId="user-1" />)

    fireEvent(window, new CustomEvent('socket-notification', {
      detail: {
        broadcastId: 'unknown-type',
        type: 'unknown_type',
        title: 'Tipo desconocido',
        body: 'Debe renderizar igual',
        createdAt: '2025-01-01T10:00:00.000Z',
      },
    }))

    expect(await screen.findByText(/tipo desconocido/i)).toBeInTheDocument()
    expect(screen.getByText('ANUNCIO')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(15_000)
    })

    await waitFor(() => {
      expect(sessionStorage.getItem('dismissed-broadcasts')).toContain('unknown-type')
    })
  })

  it('no consulta Supabase sin userId', () => {
    render(<BroadcastBanner userId="" />)

    expect(mockCreateClient).not.toHaveBeenCalled()
  })
})
