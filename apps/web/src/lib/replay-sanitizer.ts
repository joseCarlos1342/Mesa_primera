type ReplayFrame = Record<string, unknown>
type ReplayPlayer = Record<string, unknown>

function sanitizePlayer(player: unknown, userId: string): unknown {
  if (!player || typeof player !== 'object') return player

  const replayPlayer = player as ReplayPlayer
  if (replayPlayer.userId === userId) return replayPlayer

  const { privateCards: _privateCards, ...safePlayer } = replayPlayer
  return safePlayer
}

export function sanitizeReplayFrames(frames: unknown, userId: string): unknown[] {
  if (!Array.isArray(frames)) return []

  return frames.map((frame) => {
    if (!frame || typeof frame !== 'object') return frame

    const replayFrame = frame as ReplayFrame
    const players = Array.isArray(replayFrame.players)
      ? replayFrame.players.map((player) => sanitizePlayer(player, userId))
      : replayFrame.players
    const hint = replayFrame.hint && typeof replayFrame.hint === 'object'
      ? (() => {
          const { cards: _cards, ...safeHint } = replayFrame.hint as Record<string, unknown>
          return safeHint
        })()
      : replayFrame.hint

    return { ...replayFrame, players, hint }
  })
}
