import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Room } from '@colyseus/sdk'
import { WaitingRoom, type WaitingPlayer } from '../WaitingRoom'

// framer-motion no interviene aquí, pero PlayerAvatar usa SVGs inline; nada que mockear.

function makeRoom(sessionId = 'p1'): Room {
  return {
    sessionId,
    send: jest.fn(),
  } as unknown as Room
}

function makePlayers(overrides: Partial<WaitingPlayer>[] = []): WaitingPlayer[] {
  const base: WaitingPlayer[] = [
    { id: 'p1', nickname: 'Ana', chips: 6_000_000, isReady: false },
    { id: 'p2', nickname: 'Beto', chips: 5_000_000, isReady: true },
  ]
  return base.map((p, i) => ({ ...p, ...(overrides[i] ?? {}) }))
}

const baseProps = {
  maxPlayers: 7,
  requiredPlayers: 3,
  countdown: -1,
  minPique: 500_000,
  proposedPique: 0,
  proposedPiqueBy: '',
  piqueVotesFor: 0,
  piqueVotesAgainst: 0,
  piqueVotersTotal: 0,
  hasVotedPique: false,
  onVoted: jest.fn(),
  showPiqueOptions: false,
  onTogglePiqueOptions: jest.fn(),
  insufficientBalance: null,
  onRecharge: jest.fn(),
}

describe('WaitingRoom', () => {
  it('muestra el título, el pique mínimo y la lista de jugadores', () => {
    render(<WaitingRoom {...baseProps} room={makeRoom()} players={makePlayers()} />)

    expect(screen.getByText('Sala de espera')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sala de espera' })).toBeInTheDocument()
    // Pique mínimo 500.000 centavos → $5.000; banda 200.000 centavos → $2.000 (minPique < 1M).
    // El "$" es texto literal junto a la expresión, por eso comprobamos el contenido del bloque.
    const room = screen.getByTestId('waiting-room')
    expect(room.textContent).toContain('$5.000')
    expect(room.textContent).toContain('$2.000')

    const p1 = screen.getByTestId('waiting-player-p1')
    expect(within(p1).getByText('Ana')).toBeInTheDocument()
    expect(within(p1).getByText('No listo')).toBeInTheDocument()
    expect(within(p1).getByText('(tú)')).toBeInTheDocument()
    expect(p1).toHaveAttribute('data-ready', 'false')

    const p2 = screen.getByTestId('waiting-player-p2')
    expect(within(p2).getByText('Listo')).toBeInTheDocument()
    expect(p2).toHaveAttribute('data-ready', 'true')
  })

  it('usa la banda de 500.000 cuando el pique mínimo es alto', () => {
    render(<WaitingRoom {...baseProps} room={makeRoom()} players={makePlayers()} minPique={1_000_000} />)
    // Pique mínimo 1.000.000 centavos → $10.000; banda 500.000 centavos → $5.000 por jugador.
    const room = screen.getByTestId('waiting-room')
    expect(room.textContent).toContain('$10.000')
    expect(room.textContent).toContain('$5.000')
  })

  it('pinta puestos libres hasta alcanzar el mínimo requerido', () => {
    render(<WaitingRoom {...baseProps} room={makeRoom()} players={makePlayers()} requiredPlayers={3} />)
    // 2 jugadores, mínimo 3 → 1 puesto libre.
    expect(screen.getAllByText('Puesto libre')).toHaveLength(1)
  })

  it('permite marcarse listo y luego deja de estarlo según el estado local', () => {
    const notReadyRoom = makeRoom('p1')
    const { rerender } = render(
      <WaitingRoom {...baseProps} room={notReadyRoom} players={makePlayers()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /estoy listo/i }))
    expect((notReadyRoom.send as jest.Mock)).toHaveBeenCalledWith('toggleReady', { isReady: true })

    // Ahora el jugador local está listo: el botón cambia a "Ya no estoy listo".
    rerender(
      <WaitingRoom
        {...baseProps}
        room={notReadyRoom}
        players={makePlayers([{ isReady: true }])}
      />,
    )
    const toggleOff = screen.getByRole('button', { name: /ya no estoy listo/i })
    fireEvent.click(toggleOff)
    expect((notReadyRoom.send as jest.Mock)).toHaveBeenCalledWith('toggleReady', { isReady: false })
  })

  it('muestra el aviso de saldo insuficiente y permite recargar', () => {
    const onRecharge = jest.fn()
    render(
      <WaitingRoom
        {...baseProps}
        room={makeRoom()}
        players={makePlayers()}
        insufficientBalance={{ message: 'Te falta saldo para el pique' }}
        onRecharge={onRecharge}
      />,
    )

    expect(screen.getByText('Te falta saldo para el pique')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cargar saldo' }))
    expect(onRecharge).toHaveBeenCalledTimes(1)
    // El botón principal queda deshabilitado con "Saldo insuficiente".
    expect(screen.getByRole('button', { name: 'Saldo insuficiente' })).toBeDisabled()
    // No aparece el botón de listo mientras no hay saldo.
    expect(screen.queryByRole('button', { name: /estoy listo/i })).not.toBeInTheDocument()
  })

  it('indica que falta 1 jugador cuando falta exactamente uno para el mínimo', () => {
    render(
      <WaitingRoom
        {...baseProps}
        room={makeRoom()}
        players={makePlayers().slice(0, 1)}
        requiredPlayers={2}
      />,
    )
    expect(screen.getByText(/Falta 1 jugador para empezar/)).toBeInTheDocument()
  })

  it('indica cuántos jugadores faltan cuando falta más de uno', () => {
    render(
      <WaitingRoom
        {...baseProps}
        room={makeRoom()}
        players={makePlayers().slice(0, 1)}
        requiredPlayers={4}
      />,
    )
    expect(screen.getByText(/Faltan 3 jugadores para empezar/)).toBeInTheDocument()
  })

  it('muestra cuántos están listos cuando hay mínimo pero faltan confirmaciones', () => {
    render(
      <WaitingRoom
        {...baseProps}
        room={makeRoom()}
        players={makePlayers([{ isReady: false }, { isReady: true }])}
        requiredPlayers={2}
      />,
    )
    expect(screen.getByText(/Listos 1 de 2/)).toBeInTheDocument()
  })

  it('no muestra línea de estado cuando todos están listos y no hay cuenta regresiva', () => {
    render(
      <WaitingRoom
        {...baseProps}
        room={makeRoom()}
        players={makePlayers([{ isReady: true }, { isReady: true }])}
        requiredPlayers={2}
      />,
    )
    expect(screen.queryByText(/Listos/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('waiting-countdown')).not.toBeInTheDocument()
  })

  it('muestra la cuenta regresiva cuando el contador está entre 1 y 5', () => {
    render(
      <WaitingRoom
        {...baseProps}
        room={makeRoom()}
        players={makePlayers([{ isReady: true }, { isReady: true }])}
        requiredPlayers={2}
        countdown={3}
      />,
    )
    const countdown = screen.getByTestId('waiting-countdown')
    expect(countdown).toHaveTextContent('La partida empieza en')
    expect(countdown).toHaveTextContent('3')
  })

  describe('propuesta de pique y votación', () => {
    it('muestra la propuesta de otro jugador con botones de voto', () => {
      const room = makeRoom('p1')
      render(
        <WaitingRoom
          {...baseProps}
          room={room}
          players={makePlayers()}
          proposedPique={1_000_000}
          proposedPiqueBy="p2"
          piqueVotesFor={1}
          piqueVotesAgainst={0}
          piqueVotersTotal={2}
        />,
      )

      expect(screen.getByText(/Beto propone/)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
      expect((room.send as jest.Mock)).toHaveBeenCalledWith('vote_pique', { approve: true })
      expect(baseProps.onVoted).toHaveBeenCalled()
    })

    it('envía rechazo al votar en contra', () => {
      const room = makeRoom('p1')
      const onVoted = jest.fn()
      render(
        <WaitingRoom
          {...baseProps}
          onVoted={onVoted}
          room={room}
          players={makePlayers()}
          proposedPique={1_000_000}
          proposedPiqueBy="p2"
          piqueVotersTotal={2}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
      expect((room.send as jest.Mock)).toHaveBeenCalledWith('vote_pique', { approve: false })
      expect(onVoted).toHaveBeenCalled()
    })

    it('muestra "Voto registrado" cuando ya votó y no es el proponente', () => {
      render(
        <WaitingRoom
          {...baseProps}
          room={makeRoom('p1')}
          players={makePlayers()}
          proposedPique={1_000_000}
          proposedPiqueBy="p2"
          hasVotedPique
          piqueVotersTotal={2}
        />,
      )
      expect(screen.getByText('Voto registrado')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument()
    })

    it('muestra "Propusiste" sin botones de voto para el proponente', () => {
      render(
        <WaitingRoom
          {...baseProps}
          room={makeRoom('p1')}
          players={makePlayers()}
          proposedPique={2_000_000}
          proposedPiqueBy="p1"
          piqueVotersTotal={2}
        />,
      )
      expect(screen.getByText(/Propusiste/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument()
      expect(screen.queryByText('Voto registrado')).not.toBeInTheDocument()
    })

    it('usa "Jugador" como proponente cuando el id no está en la lista', () => {
      render(
        <WaitingRoom
          {...baseProps}
          room={makeRoom('p1')}
          players={makePlayers()}
          proposedPique={1_000_000}
          proposedPiqueBy="fantasma"
          piqueVotersTotal={2}
        />,
      )
      expect(screen.getByText(/Jugador propone/)).toBeInTheDocument()
    })

    it('abre las opciones de pique al pulsar "Proponer otro pique"', () => {
      const onTogglePiqueOptions = jest.fn()
      render(
        <WaitingRoom
          {...baseProps}
          room={makeRoom('p1')}
          players={makePlayers()}
          onTogglePiqueOptions={onTogglePiqueOptions}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Proponer otro pique' }))
      expect(onTogglePiqueOptions).toHaveBeenCalledWith(true)
    })

    it('muestra las opciones de pique y envía la propuesta elegida', () => {
      const room = makeRoom('p1')
      const onTogglePiqueOptions = jest.fn()
      render(
        <WaitingRoom
          {...baseProps}
          room={room}
          players={makePlayers()}
          showPiqueOptions
          onTogglePiqueOptions={onTogglePiqueOptions}
        />,
      )

      // La opción igual al pique mínimo (500.000 centavos = $5.000) queda deshabilitada.
      expect(screen.getByRole('button', { name: '$5.000' })).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: '$10.000' }))
      expect((room.send as jest.Mock)).toHaveBeenCalledWith('propose_pique', { amount: 1_000_000 })
      expect(onTogglePiqueOptions).toHaveBeenCalledWith(false)

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(onTogglePiqueOptions).toHaveBeenCalledWith(false)
    })
  })

  it('oculta controles de sala cuando no hay room (solo mesa y jugadores)', () => {
    render(<WaitingRoom {...baseProps} room={null} players={makePlayers()} />)
    expect(screen.getByText('Sala de espera')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /estoy listo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Proponer otro pique' })).not.toBeInTheDocument()
  })
})
