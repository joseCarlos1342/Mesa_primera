import { sanitizeReplayFrames } from '@/lib/replay-sanitizer'

describe('sanitizeReplayFrames', () => {
  it('preserves the requesting player cards and removes every rival private hand', () => {
    const frames = [
      {
        phase: 'APUESTA_4_CARTAS',
        players: [
          { userId: 'player-1', nickname: 'Ana', privateCards: ['A♠'] },
          { userId: 'player-2', nickname: 'Luis', privateCards: ['K♥'] },
        ],
      },
      {
        phase: 'SHOWDOWN',
        players: [
          { userId: 'player-2', nickname: 'Luis', privateCards: ['K♥'] },
          { userId: 'player-3', nickname: 'Eva', privateCards: ['Q♦'] },
        ],
      },
    ]

    expect(sanitizeReplayFrames(frames, 'player-1')).toEqual([
      {
        phase: 'APUESTA_4_CARTAS',
        players: [
          { userId: 'player-1', nickname: 'Ana', privateCards: ['A♠'] },
          { userId: 'player-2', nickname: 'Luis' },
        ],
      },
      {
        phase: 'SHOWDOWN',
        players: [
          { userId: 'player-2', nickname: 'Luis' },
          { userId: 'player-3', nickname: 'Eva' },
        ],
      },
    ])
  })

  it('removes hint cards while preserving other public hint data', () => {
    const frames = [
      {
        hint: { type: 'PIQUE', cards: ['A♠'], message: 'Tu turno' },
        players: [],
      },
    ]

    expect(sanitizeReplayFrames(frames, 'player-1')).toEqual([
      {
        hint: { type: 'PIQUE', message: 'Tu turno' },
        players: [],
      },
    ])
  })

  it('does not mutate the replay payload while sanitizing it', () => {
    const source = {
      players: [{ userId: 'rival', privateCards: ['A♠'] }],
      hint: { cards: ['K♥'], message: 'visible' },
    }

    sanitizeReplayFrames([source], 'player-1')

    expect(source).toEqual({
      players: [{ userId: 'rival', privateCards: ['A♠'] }],
      hint: { cards: ['K♥'], message: 'visible' },
    })
  })

  it('treats a player without the requesting user id as a rival', () => {
    const frames = [
      {
        players: [
          { id: 'player-1', privateCards: ['A♠'] },
          { userId: 'player-1', privateCards: ['K♥'] },
        ],
      },
    ]

    expect(sanitizeReplayFrames(frames, 'player-1')).toEqual([
      {
        players: [
          { id: 'player-1' },
          { userId: 'player-1', privateCards: ['K♥'] },
        ],
      },
    ])
  })

  it('handles incomplete frames without throwing or inventing players', () => {
    expect(sanitizeReplayFrames(null, 'player-1')).toEqual([])
    expect(sanitizeReplayFrames([null, 'legacy-frame', { players: 'unknown', hint: null }], 'player-1')).toEqual([
      null,
      'legacy-frame',
      { players: 'unknown', hint: null },
    ])
  })
})
