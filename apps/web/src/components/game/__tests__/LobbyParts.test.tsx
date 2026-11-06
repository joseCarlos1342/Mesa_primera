import { fireEvent, render, screen } from '@testing-library/react'

import type { LobbyTable } from '@/app/actions/admin-tables'
import {
  LobbyTableCard,
  ServerStatusBar,
  toTableView,
  type LobbyTableView,
} from '../LobbyParts'

function baseView(overrides: Partial<LobbyTableView> = {}): LobbyTableView {
  return {
    key: 'room-1',
    name: 'Mesa #1',
    isPlaceholder: false,
    isCustom: false,
    occupied: 0,
    capacity: 7,
    minEntryCents: 5_000_000,
    minPiqueCents: 500_000,
    enabledChips: undefined,
    state: 'free',
    ...overrides,
  }
}

function dbTable(overrides: Partial<LobbyTable> = {}): LobbyTable {
  return {
    id: 't1',
    name: 'Mesa DB',
    game_type: 'primera_28',
    max_players: 7,
    table_category: 'common',
    lobby_slot: 1,
    min_entry_cents: 5_000_000,
    min_pique_cents: 500_000,
    disabled_chips: [],
    sort_order: 1,
    ...overrides,
  }
}

describe('ServerStatusBar', () => {
  it('muestra estado "conectando" sin contadores ni botón', () => {
    render(
      <ServerStatusBar status="connecting" openTables={3} playingTables={1} players={5} onRetry={jest.fn()} />,
    )

    const bar = screen.getByTestId('server-status')
    expect(bar).toHaveAttribute('data-status', 'connecting')
    expect(screen.getByText(/conectando con las mesas/i)).toBeInTheDocument()
    expect(screen.queryByText('mesas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
  })

  it('muestra contadores reales cuando está en línea', () => {
    render(
      <ServerStatusBar status="online" openTables={4} playingTables={2} players={9} onRetry={jest.fn()} />,
    )

    const bar = screen.getByTestId('server-status')
    expect(bar).toHaveAttribute('data-status', 'online')
    expect(screen.getByText(/mesas en línea/i)).toBeInTheDocument()
    expect(screen.getByText('4').parentElement).toHaveTextContent('mesas')
    expect(screen.getByText('2').parentElement).toHaveTextContent('en juego')
    expect(screen.getByText('9').parentElement).toHaveTextContent('jugadores')
  })

  it('usa "jugador" en singular cuando solo hay uno', () => {
    render(
      <ServerStatusBar status="online" openTables={2} playingTables={0} players={1} onRetry={jest.fn()} />,
    )

    expect(screen.getByText('jugador')).toBeInTheDocument()
    expect(screen.queryByText('jugadores')).not.toBeInTheDocument()
  })

  it('muestra botón Reintentar en offline y lo dispara', () => {
    const onRetry = jest.fn()
    render(
      <ServerStatusBar status="offline" openTables={0} playingTables={0} players={0} onRetry={onRetry} />,
    )

    const bar = screen.getByTestId('server-status')
    expect(bar).toHaveAttribute('data-status', 'offline')
    expect(screen.getByText(/sin conexión con las mesas/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('LobbyTableCard', () => {
  it('mesa libre placeholder muestra "Abrir mesa" y permite jugar', () => {
    const onPlay = jest.fn()
    render(
      <LobbyTableCard
        table={baseView({ isPlaceholder: true, state: 'free' })}
        busy={false}
        disabled={false}
        onPlay={onPlay}
      />,
    )

    const card = screen.getByTestId('lobby-table')
    expect(card).toHaveAttribute('data-state', 'free')
    expect(screen.getByText('Libre')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Abrir mesa' })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('mesa con jugadores muestra "Entrar" y etiqueta "Con jugadores"', () => {
    render(
      <LobbyTableCard
        table={baseView({ occupied: 3, state: 'waiting' })}
        busy={false}
        disabled={false}
        onPlay={jest.fn()}
      />,
    )

    expect(screen.getByTestId('lobby-table')).toHaveAttribute('data-state', 'waiting')
    expect(screen.getByText('Con jugadores')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    expect(screen.getByText('3/7')).toBeInTheDocument()
  })

  it('mesa llena deshabilita el botón "Mesa llena"', () => {
    render(
      <LobbyTableCard
        table={baseView({ occupied: 7, state: 'full' })}
        busy={false}
        disabled={false}
        onPlay={jest.fn()}
      />,
    )

    expect(screen.getByTestId('lobby-table')).toHaveAttribute('data-state', 'full')
    expect(screen.getByText('Llena')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mesa llena' })).toBeDisabled()
  })

  it('estado busy muestra "Preparando mesa…" y aria-busy', () => {
    render(
      <LobbyTableCard
        table={baseView({ isPlaceholder: true })}
        busy
        disabled={false}
        onPlay={jest.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: /preparando mesa/i })
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('estado disabled deshabilita el botón aunque la mesa esté libre', () => {
    render(
      <LobbyTableCard
        table={baseView({ isPlaceholder: true })}
        busy={false}
        disabled
        onPlay={jest.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Abrir mesa' })).toBeDisabled()
  })

  it('admin: muestra botón "Cerrar <nombre>" y lo dispara', () => {
    const onClose = jest.fn()
    render(
      <LobbyTableCard
        table={baseView({ name: 'Mesa VIP', occupied: 2, state: 'waiting' })}
        busy={false}
        disabled={false}
        onPlay={jest.fn()}
        onClose={onClose}
      />,
    )

    const closeButton = screen.getByRole('button', { name: 'Cerrar Mesa VIP' })
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sin onClose no muestra botón de cierre', () => {
    render(
      <LobbyTableCard
        table={baseView()}
        busy={false}
        disabled={false}
        onPlay={jest.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /cerrar/i })).not.toBeInTheDocument()
  })

  it('mesa personalizada muestra fichas habilitadas', () => {
    render(
      <LobbyTableCard
        table={baseView({ isCustom: true, enabledChips: 4 })}
        busy={false}
        disabled={false}
        onPlay={jest.fn()}
      />,
    )

    expect(screen.getByText(/mesa personalizada · 4 fichas habilitadas/i)).toBeInTheDocument()
  })

  it('mesa personalizada sin conteo de fichas no imprime la línea', () => {
    render(
      <LobbyTableCard
        table={baseView({ isCustom: true, enabledChips: undefined })}
        busy={false}
        disabled={false}
        onPlay={jest.fn()}
      />,
    )

    expect(screen.queryByText(/fichas habilitadas/i)).not.toBeInTheDocument()
  })
})

describe('toTableView', () => {
  it('placeholder: ocupación 0 y estado libre con defaults', () => {
    const view = toTableView({
      roomId: 'placeholder-1',
      metadata: { tableName: 'Mesa #1', isPlaceholder: true },
    })

    expect(view).toMatchObject({
      key: 'placeholder-1',
      name: 'Mesa #1',
      isPlaceholder: true,
      isCustom: false,
      occupied: 0,
      capacity: 7,
      minEntryCents: 5_000_000,
      minPiqueCents: 500_000,
      state: 'free',
    })
    expect(view.enabledChips).toBeUndefined()
  })

  it('sala viva con jugadores queda en estado "waiting"', () => {
    const view = toTableView({
      roomId: 'live-1',
      clients: 3,
      maxClients: 7,
      metadata: { tableName: 'Mesa Viva', activePlayers: 3, totalReservedSeats: 3 },
    })

    expect(view.occupied).toBe(3)
    expect(view.capacity).toBe(7)
    expect(view.state).toBe('waiting')
    expect(view.isPlaceholder).toBe(false)
  })

  it('usa clients cuando no hay activePlayers en metadata', () => {
    const view = toTableView({
      roomId: 'live-2',
      clients: 2,
      metadata: { tableName: 'Mesa' },
    })

    expect(view.occupied).toBe(2)
    expect(view.capacity).toBe(7)
    expect(view.state).toBe('waiting')
  })

  it('cae a 0 ocupados cuando una sala viva no reporta clients', () => {
    const view = toTableView({
      roomId: 'live-empty',
      metadata: { tableName: 'Mesa recién abierta' },
    })

    expect(view.occupied).toBe(0)
    expect(view.state).toBe('free')
  })

  it('marca "full" cuando totalReservedSeats alcanza la capacidad', () => {
    const view = toTableView({
      roomId: 'full-1',
      clients: 2,
      maxClients: 7,
      metadata: { tableName: 'Mesa Llena', activePlayers: 2, totalReservedSeats: 7 },
    })

    expect(view.occupied).toBe(2)
    expect(view.state).toBe('full')
  })

  it('reserved cae a occupied cuando no hay totalReservedSeats', () => {
    const view = toTableView({
      roomId: 'full-2',
      clients: 7,
      maxClients: 7,
      metadata: { tableName: 'Mesa', activePlayers: 7 },
    })

    expect(view.state).toBe('full')
  })

  it('custom por metadata calcula fichas habilitadas (6 - deshabilitadas)', () => {
    const view = toTableView({
      roomId: 'custom-1',
      clients: 1,
      maxClients: 4,
      metadata: {
        tableName: 'Mesa VIP',
        isCustom: true,
        disabledChips: [100000, 200000],
        minEntry: 7_000_000,
        minPique: 900_000,
      },
    })

    expect(view.isCustom).toBe(true)
    expect(view.enabledChips).toBe(4)
    expect(view.capacity).toBe(4)
    expect(view.minEntryCents).toBe(7_000_000)
    expect(view.minPiqueCents).toBe(900_000)
  })

  it('custom por configuración de BD calcula fichas desde disabled_chips', () => {
    const view = toTableView({
      roomId: 'custom-db-1',
      metadata: { tableName: 'Mesa Privada', isPlaceholder: true },
      maxClients: 5,
      _dbConfig: dbTable({
        name: 'Mesa Privada',
        table_category: 'custom',
        max_players: 5,
        min_entry_cents: 6_000_000,
        min_pique_cents: 800_000,
        disabled_chips: [100000, 200000, 500000],
      }),
    })

    expect(view.isCustom).toBe(true)
    expect(view.enabledChips).toBe(3)
    expect(view.minEntryCents).toBe(6_000_000)
    expect(view.minPiqueCents).toBe(800_000)
  })

  it('aplica defaults completos cuando no hay metadata ni dbConfig', () => {
    const view = toTableView({ roomId: 'bare' })

    expect(view).toMatchObject({
      key: 'bare',
      name: 'Mesa',
      isPlaceholder: false,
      isCustom: false,
      occupied: 0,
      capacity: 7,
      minEntryCents: 5_000_000,
      minPiqueCents: 500_000,
      state: 'free',
    })
    expect(view.enabledChips).toBeUndefined()
  })

  it('tolera metadata nula usando defaults', () => {
    const view = toTableView({ roomId: 'null-meta', metadata: null })

    expect(view.name).toBe('Mesa')
    expect(view.state).toBe('free')
  })

  it('prioriza max_players de BD cuando no hay maxClients', () => {
    const view = toTableView({
      roomId: 'cap',
      metadata: { tableName: 'Mesa', isPlaceholder: true },
      _dbConfig: dbTable({ max_players: 5 }),
    })

    expect(view.capacity).toBe(5)
  })

  it('usa el nombre de BD cuando metadata no trae tableName', () => {
    const view = toTableView({
      roomId: 'name-from-db',
      metadata: { isPlaceholder: true },
      _dbConfig: dbTable({ name: 'Mesa del Club' }),
    })

    expect(view.name).toBe('Mesa del Club')
  })
})
