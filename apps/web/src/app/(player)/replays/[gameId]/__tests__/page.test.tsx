import { render, screen, waitFor, within } from '@testing-library/react'
import ReplayViewer from '../page'
import { getPlayerReplayDetail } from '@/app/actions/replays'

jest.mock('@/app/actions/replays', () => ({
  getPlayerReplayDetail: jest.fn(),
}))

jest.mock('@/components/replay/ReplayController', () => ({
  ReplayController: ({ frames }: { frames: unknown[] }) => <div data-testid="replay-controller">Frames: {frames.length}</div>,
}))

jest.mock('@/components/replay/LandscapeLockOverlay', () => ({
  LandscapeLockOverlay: () => <div data-testid="landscape-overlay" />,
}))

// La reconstrucción de manos finales usa PlayingCard (next/image); lo simplificamos.
jest.mock('@/components/landing/PlayingCard', () => ({
  PlayingCard: ({ card }: { card: { rank: number; suit: string } }) => (
    <img data-testid="playing-card" alt={`${card.rank}-${card.suit}`} />
  ),
}))

const mockGetPlayerReplayDetail = getPlayerReplayDetail as jest.MockedFunction<typeof getPlayerReplayDetail>

describe('ReplayViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPlayerReplayDetail.mockResolvedValue(null)
  })

  it('muestra el estado de carga antes de resolver la acción', async () => {
    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)
    // El contenedor de carga se anuncia con aria-busy y una etiqueta accesible.
    expect(screen.getByLabelText('Cargando repetición')).toBeInTheDocument()
    await screen.findByText('Repetición no encontrada')
  })

  it('muestra el estado vacío cuando la acción no autoriza el replay', async () => {
    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)
    expect(await screen.findByText('Repetición no encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a repeticiones/i })).toHaveAttribute('href', '/replays')
  })

  it('renderiza el detalle saneado con reconstrucción visual, resumen y manos finales', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'game-123',
      created_at: '2026-05-28T10:30:00.000Z',
      version: 2,
      frames: [{ players: [] }, { players: [] }],
      players: [{ userId: 'user-1', nickname: 'Ana' }],
      pot_breakdown: { totalPot: 100000, piquePot: 20000 },
      final_hands: { 'user-1': { nickname: 'Ana', handType: 'PRIMERA', cards: '7-O,7-C' } },
      timeline: [],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByTestId('replay-controller')).toHaveTextContent('Frames: 2')
    })
    expect(screen.getByRole('heading', { name: 'Repetición de la partida' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    // handType PRIMERA → "Primera".
    expect(screen.getByText('Primera')).toBeInTheDocument()
    // No se filtra seed ni vista admin.
    expect(screen.queryByText(/seed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/modo admin/i)).not.toBeInTheDocument()
    expect(mockGetPlayerReplayDetail).toHaveBeenCalledWith('game-1')
  })

  it('muestra el resumen con frames vacíos y sin manos finales ni línea de tiempo', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'legacy-1',
      created_at: '2026-05-28T10:30:00.000Z',
      version: 1,
      frames: [],
      players: [],
      pot_breakdown: {},
      final_hands: {},
      timeline: [],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'legacy-1' })} />)

    // El controlador se monta con 0 frames (mostrará su propio estado degradado).
    expect(await screen.findByTestId('replay-controller')).toHaveTextContent('Frames: 0')
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Manos finales' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Línea de tiempo' })).not.toBeInTheDocument()
  })

  it('traduce eventos, resuelve nombres de jugadores y conserva los detalles del timeline', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'game-123',
      created_at: '2026-05-28T10:30:00.000Z',
      version: 2,
      frames: [{ players: [{ id: 'session-1', nickname: 'Ana' }] }],
      players: [{ userId: 'user-2', nickname: 'Beto' }],
      pot_breakdown: {},
      final_hands: {},
      timeline: [
        { action: 'voy', player: 'session-1', amount: 100_000, phase: 'PIQUE' },
        { action: 'misterio', player: 'user-2', payout: 200_000, tiene: false },
        { event: 'declarar_juego', winner: 'unknown-player', droppedCards: ['1-O', '7-C'] },
      ],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-123' })} />)

    const timeline = (await screen.findByRole('heading', { name: 'Línea de tiempo' })).closest('section')!
    // Acción conocida traducida.
    expect(within(timeline).getByText('Voy')).toBeInTheDocument()
    // Acción desconocida se muestra en mayúsculas.
    expect(within(timeline).getByText('MISTERIO')).toBeInTheDocument()
    // Evento conocido traducido.
    expect(within(timeline).getByText('Declara Juego')).toBeInTheDocument()
    // Nombres resueltos por sessionId (frames) y por userId (players).
    expect(within(timeline).getByText(/Ana/)).toBeInTheDocument()
    expect(within(timeline).getByText(/Beto/)).toBeInTheDocument()
    // Jugador desconocido cae al prefijo del id.
    expect(within(timeline).getByText(/unknow/)).toBeInTheDocument()
    // Detalles: cartas descartadas y marca de "No Juego".
    expect(within(timeline).getByText(/Descarta 1-O, 7-C/)).toBeInTheDocument()
    expect(within(timeline).getByText(/No Juego/)).toBeInTheDocument()
  })

  it('cubre ramas del detalle: eventos variados, métricas y manos sin tipo', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'game-ramas',
      // Sin created_at → la cabecera no muestra la fecha (rama de playedAt nulo).
      created_at: undefined,
      version: 2,
      frames: [
        null,
        { players: undefined },
        {
          players: [
            { id: 'session-9', nickname: 'Nora' },
            // id coincide con el userId de un jugador → el segundo bucle verá la
            // clave ya ocupada (rama "ya existe").
            { id: 'user-9', nickname: 'Nora' },
            // Jugador de frame sin nickname → no entra al mapa (rama negativa).
            { id: 'session-sin-nick' },
            // id duplicado → no sobreescribe (rama de "ya existe").
            { id: 'session-9', nickname: 'Otra' },
            // sin id → rama negativa.
            { nickname: 'Fantasma' },
            // jugador nulo → rama de optional chaining p?.
            null,
          ],
        },
      ],
      players: [
        { userId: 'user-9', nickname: 'Nora' },
        // Jugador sin userId → rama negativa del segundo bucle.
        { nickname: 'SinId' },
        // Jugador con userId pero sin nickname → se resuelve por prefijo del id.
        { userId: 'muted-user-123' },
      ],
      pot_breakdown: { totalPot: 500000, piquePot: 100000 },
      final_hands: {
        // handType desconocido → handTypeLabel devuelve el valor crudo.
        'user-9': { nickname: 'Nora', handType: 'RARO', cards: '7-O,7-C' },
        // Sin nickname → cae al literal "Jugador"; sin cards → '' por defecto.
        'user-10': {},
      },
      timeline: [
        // Evento conocido con pago, fase, "Tiene Juego" y marca de tiempo.
        { event: 'pique_won', winner: 'session-9', payout: 300_000, phase: 'PIQUE', tiene: true, time: '2026-05-28T10:40:00.000Z' },
        // Evento sin player y sin tipo conocido → etiqueta "Evento".
        {},
        // Evento con type (no event ni action) → usa type como etiqueta.
        { type: 'custom-type' },
        // Evento cuyo player resuelve por userId (no está en el mapa de sesión).
        { action: 'paso', userId: 'desconocido-xyz' },
        // Evento con player presente en `players` pero sin nickname → prefijo del id.
        { action: 'paso', player: 'muted-user-123' },
      ],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-ramas' })} />)

    const timeline = (await screen.findByRole('heading', { name: 'Línea de tiempo' })).closest('section')!
    const resumen = screen.getByRole('heading', { name: 'Resumen' }).closest('section')!
    expect(within(resumen).getByText('Jugadores')).toBeInTheDocument()
    // handType desconocido se muestra tal cual.
    expect(screen.getByText('RARO')).toBeInTheDocument()
    // Mano sin nickname cae a "Jugador".
    expect(screen.getByText('Jugador')).toBeInTheDocument()
    // Detalles del evento: pago, fase y "Tiene Juego".
    expect(within(timeline).getByText(/Pago/)).toBeInTheDocument()
    expect(within(timeline).getByText(/PIQUE/)).toBeInTheDocument()
    expect(within(timeline).getByText(/Tiene Juego/)).toBeInTheDocument()
    expect(within(timeline).getByText('Gana Pique')).toBeInTheDocument()
    // Evento sin datos → etiqueta genérica "Evento".
    expect(within(timeline).getByText('Evento')).toBeInTheDocument()
    // Evento con type → usa el type.
    expect(within(timeline).getByText('custom-type')).toBeInTheDocument()
    // Player resuelto por prefijo del id cuando no está en ningún mapa.
    expect(within(timeline).getByText(/descon/)).toBeInTheDocument()
    // Player en `players` sin nickname → prefijo del id.
    expect(within(timeline).getByText(/muted-/)).toBeInTheDocument()
  })

  it('renderiza una carta por cada carta válida de las manos finales', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'game-cards',
      created_at: '2026-05-28T10:30:00.000Z',
      version: 2,
      frames: [{ players: [] }],
      players: [],
      pot_breakdown: {},
      final_hands: {
        'user-1': { nickname: 'Ana', handType: 'CHIVO', cards: '7-O,7-C' },
        // Carta fuera de rango o inválida se descarta (toDeckCard → null).
        'user-2': { nickname: 'Beto', handType: '', cards: '12-O,9-X' },
      },
      timeline: [],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-cards' })} />)

    await screen.findByRole('heading', { name: 'Manos finales' })
    // Ana aporta 2 cartas válidas; Beto, ninguna (12 y valor inválido fuera de 1..7).
    expect(screen.getAllByTestId('playing-card')).toHaveLength(2)
    expect(screen.getByText('Chivo')).toBeInTheDocument()
    expect(screen.getByText('Beto')).toBeInTheDocument()
  })
})
