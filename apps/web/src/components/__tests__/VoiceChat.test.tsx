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
      body: JSON.stringify({ room: 'mesa-1', username: 'Jose' }),
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


    expect(await screen.findByText('Audio de Jugadores')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button').at(-1)!)

    await waitFor(() => {
      expect(screen.queryByText('Audio de Jugadores')).not.toBeInTheDocument()
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

    expect(screen.queryByText('Audio de Jugadores')).not.toBeInTheDocument()
  })

  it('muestra estado vacio si no hay participantes remotos', () => {
    participants = [{ identity: 'local-user', name: 'Yo' }]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    expect(screen.getByText('No hay otros jugadores en la sala.')).toBeInTheDocument()
  })

  it('silencia y restaura el audio remoto adjunto', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }))
    expect(audioElement.muted).toBe(true)
    expect(screen.getByText('Silenciado')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /silenciado/i }))
    expect(audioElement.muted).toBe(false)
  })

  it('deshabilita la accion cuando el participante remoto no tiene track de audio', () => {
    participants = [
      { identity: 'local-user', name: 'Yo' },
      { identity: 'remote-1', name: 'Ana', getTrackPublication: () => null },
    ]

    render(<PlayerAudioModal isOpen onClose={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeDisabled()
  })
})
