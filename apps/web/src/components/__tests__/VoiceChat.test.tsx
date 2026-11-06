import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { VoiceChat, PlayerAudioModal } from '../VoiceChat'

const setMicrophoneEnabled = jest.fn()
let microphoneEnabled = false
let connectionState = 'connected'
let microphonePermission: 'granted' | 'denied' | 'unavailable' = 'granted'
let participants: any[] = []
let localParticipant: any = { identity: 'local-user', setMicrophoneEnabled }

jest.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ children, token, serverUrl, className }: any) => (
    <section data-testid="livekit-room" data-token={token} data-server-url={serverUrl} className={className}>
      {children}
    </section>
  ),
  RoomAudioRenderer: () => <div data-testid="room-audio-renderer" />,
  StartAudio: ({ children, label }: any) => (
    <button type="button" aria-label={label}>{children}</button>
  ),
  useLocalParticipant: () => ({
    localParticipant,
    isMicrophoneEnabled: microphoneEnabled,
  }),
  useParticipants: () => participants,
  useIsSpeaking: (participant: any) => Boolean(participant.isSpeaking),
  useConnectionState: () => connectionState,
}))

jest.mock('livekit-client', () => ({
  ConnectionState: { Connected: 'connected' },
  Track: { Source: { Microphone: 'microphone' } },
}))

jest.mock('@/hooks/useGamePermissions', () => ({
  useGamePermissions: () => ({ microphone: microphonePermission }),
}))

describe('VoiceChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    microphoneEnabled = false
    connectionState = 'connected'
    microphonePermission = 'granted'
    participants = []
    localParticipant = { identity: 'local-user', setMicrophoneEnabled }
    global.fetch = jest.fn(async () =>
      ({ json: async () => ({ token: 'voice-token', url: 'wss://voice.test' }) })
    ) as jest.Mock
  })

  it('muestra estado de conexion mientras solicita token de LiveKit', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock

    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    expect(screen.getByText('Conectando canal de voz...')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('/api/livekit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'mesa-1' }),
    })
  })

  it('renderiza sala, audio y control de microfono cuando recibe token', async () => {
    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    const room = await screen.findByTestId('livekit-room')

    expect(room).toHaveAttribute('data-token', 'voice-token')
    expect(room).toHaveAttribute('data-server-url', 'wss://voice.test')
    expect(screen.getByTestId('room-audio-renderer')).toBeInTheDocument()
    expect(screen.getByTitle('Activar o desactivar micrófono')).toBeEnabled()
  })

  it('permite activar el microfono si esta conectado y tiene permiso', async () => {
    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    const micButton = await screen.findByTitle('Activar o desactivar micrófono')
    await act(async () => {
      fireEvent.click(micButton)
    })

    expect(setMicrophoneEnabled).toHaveBeenCalledWith(true)
  })

  it('bloquea el microfono si el navegador no tiene permisos', async () => {
    microphonePermission = 'denied'

    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    expect(await screen.findByTitle('Activar o desactivar micrófono')).toBeDisabled()
  })

  it('apaga y bloquea el microfono cuando moderacion silencia al jugador', async () => {
    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    await screen.findByTitle('Activar o desactivar micrófono')
    await act(async () => {
      window.dispatchEvent(new CustomEvent('admin-voice-muted'))
    })

    expect(setMicrophoneEnabled).toHaveBeenCalledWith(false)
    expect(screen.getByTitle('Micrófono silenciado por administración')).toBeDisabled()
  })

  it('reactiva el control cuando administración retira el mute', async () => {
    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    await screen.findByTitle('Activar o desactivar micrófono')
    await act(async () => {
      window.dispatchEvent(new Event('admin-voice-muted'))
      window.dispatchEvent(new Event('admin-voice-unmuted'))
    })

    expect(screen.getByTitle('Activar o desactivar micrófono')).toBeEnabled()
  })

  it('muestra participantes activos cuando showSpeakers esta habilitado', async () => {
    participants = [
      { identity: 'p1', name: 'Ana', isSpeaking: true },
      { identity: 'p2', name: 'Luis', isSpeaking: false },
    ]

    render(<VoiceChat roomName="mesa-1" username="Jose" showSpeakers />)

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Luis')).toBeInTheDocument()
  })

  it('abre el modal de audio desde el evento global y permite cerrarlo', async () => {
    participants = [{ identity: 'local-user', name: 'Yo', isSpeaking: false }]

    render(<VoiceChat roomName="mesa-1" username="Jose" />)
    await screen.findByTestId('livekit-room')

    await act(async () => {
      window.dispatchEvent(new Event('open-player-audio-modal'))
    })


    expect(await screen.findByText('Audio de jugadores')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button').at(-1)!)

    await waitFor(() => {
      expect(screen.queryByText('Audio de jugadores')).not.toBeInTheDocument()
    })
  })
})

describe('PlayerAudioModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localParticipant = { identity: 'local-user', setMicrophoneEnabled }
  })

  it('no renderiza contenido cuando esta cerrado', () => {
    participants = [{ identity: 'remote-1', name: 'Ana' }]

    render(<PlayerAudioModal isOpen={false} onClose={jest.fn()} />)

    expect(screen.queryByText('Audio de jugadores')).not.toBeInTheDocument()
  })

  it('muestra estado vacio si no hay participantes remotos', () => {
    participants = [{ identity: 'local-user', name: 'Yo' }]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    expect(screen.getByText('No hay otros jugadores con voz en la mesa.')).toBeInTheDocument()
  })

  it('silencia y restaura el audio remoto adjunto (aria-pressed)', () => {
    const audioElement = document.createElement('audio')
    participants = [
      { identity: 'local-user', name: 'Yo' },
      {
        identity: 'remote-1',
        name: 'Ana',
        getTrackPublication: () => ({ track: { attachedElements: [audioElement], enabled: true } }),
      },
    ]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    const toggle = screen.getByRole('button', { name: 'Silenciar a Ana' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(audioElement.muted).toBe(true)
    expect(screen.getByText('Silenciado')).toBeInTheDocument()

    const activate = screen.getByRole('button', { name: 'Activar voz de Ana' })
    expect(activate).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(activate)
    expect(audioElement.muted).toBe(false)
  })

  it('deshabilita la accion cuando el participante remoto no tiene track de audio', () => {
    participants = [
      { identity: 'local-user', name: 'Yo' },
      { identity: 'remote-1', name: 'Ana', getTrackPublication: () => null },
    ]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Silenciar a Ana' })).toBeDisabled()
  })

  it('no hace nada al silenciar si el track existe pero es null', () => {
    participants = [
      { identity: 'local-user', name: 'Yo' },
      { identity: 'remote-1', name: 'Ana', getTrackPublication: () => ({ track: null }) },
    ]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Silenciar a Ana' }))
    expect(screen.getByRole('button', { name: 'Silenciar a Ana' })).toBeInTheDocument()
  })

  it('silencia via track.enabled cuando no hay elementos adjuntos', () => {
    const mockTrack = { attachedElements: [] as HTMLMediaElement[], enabled: true }
    participants = [
      { identity: 'local-user', name: 'Yo' },
      { identity: 'remote-1', name: 'Ana', isSpeaking: true, getTrackPublication: () => ({ track: mockTrack }) },
    ]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Silenciar a Ana' }))
    expect(mockTrack.enabled).toBe(false)
    expect(screen.getByText('Silenciado')).toBeInTheDocument()
  })

  it('muestra identity cuando el nombre es "Jugador" o esta ausente en el modal', () => {
    const audioEl = document.createElement('audio')
    participants = [
      { identity: 'local-user', name: 'Yo' },
      { identity: 'jug-1', name: 'Jugador', isSpeaking: false, getTrackPublication: () => ({ track: { attachedElements: [audioEl], enabled: true } }) },
      { identity: 'jug-2', name: undefined, isSpeaking: false, getTrackPublication: () => ({ track: { attachedElements: [audioEl], enabled: true } }) },
    ]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    expect(screen.getByText('jug-1')).toBeInTheDocument()
    expect(screen.getByText('jug-2')).toBeInTheDocument()
  })
})

describe('VoiceChat (branches adicionales)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    microphoneEnabled = false
    connectionState = 'connected'
    microphonePermission = 'granted'
    participants = []
    localParticipant = { identity: 'local-user', setMicrophoneEnabled }
    global.fetch = jest.fn(async () =>
      ({ json: async () => ({ token: 'voice-token', url: 'wss://voice.test' }) })
    ) as jest.Mock
  })

  it('maneja error al solicitar token de LiveKit', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network error')))
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to fetch LiveKit token', expect.any(Error))
    })
    expect(screen.getByText('Conectando canal de voz...')).toBeInTheDocument()
  })

  it('muestra aviso role=alert cuando falla togglear microfono', async () => {
    setMicrophoneEnabled.mockRejectedValue(new Error('hardware error'))
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    const micButton = await screen.findByTitle('Activar o desactivar micrófono')
    await act(async () => {
      fireEvent.click(micButton)
    })

    expect(consoleError).toHaveBeenCalledWith('Failed to toggle mic', expect.any(Error))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo activar el micrófono/i)
  })

  it('oculta el aviso del micrófono después de 6 segundos', async () => {
    jest.useFakeTimers()
    setMicrophoneEnabled.mockRejectedValue(new Error('hardware error'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    // Avanza timers para resolver el fetch del token.
    await act(async () => {
      await Promise.resolve()
    })
    const micButton = screen.getByTitle('Activar o desactivar micrófono')
    await act(async () => {
      fireEvent.click(micButton)
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo activar el micrófono/i)

    await act(async () => {
      jest.advanceTimersByTime(6000)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('muestra icono de microfono activo cuando esta habilitado', async () => {
    microphoneEnabled = true

    render(<VoiceChat roomName="mesa-1" username="Jose" />)

    const micButton = await screen.findByTitle('Activar o desactivar micrófono')
    expect(micButton).toHaveClass('from-[#4ade80]')
    expect(micButton.querySelector('.animate-ping')).toBeInTheDocument()
  })

  it('oculta nombre cuando el participante se llama "Jugador" en speakers activos', async () => {
    participants = [{ identity: 'p1', name: 'Jugador', isSpeaking: false }]

    render(<VoiceChat roomName="mesa-1" username="Jose" showSpeakers />)

    await screen.findByTestId('livekit-room')
    expect(screen.queryByText('Jugador')).not.toBeInTheDocument()
  })
})
