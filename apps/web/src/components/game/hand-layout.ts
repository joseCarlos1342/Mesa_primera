export type HandArcVariant = 'opponent' | 'self'
export type HandArcDensity = 'compact' | 'comfortable'

interface HandArcLayoutInput {
  index: number
  count: number
  variant: HandArcVariant
  density: HandArcDensity
}

interface HandArcConfig {
  spread: number
  rotate: number
  curve: number
}

const HAND_ARC_CONFIG: Record<HandArcVariant, Record<HandArcDensity, HandArcConfig>> = {
  opponent: {
    compact: { spread: 24, rotate: 4, curve: 8 },
    comfortable: { spread: 28, rotate: 4.25, curve: 9 },
  },
  self: {
    compact: { spread: 38, rotate: 4.5, curve: 10 },
    comfortable: { spread: 52, rotate: 5, curve: 12 },
  },
}

export function getArcCardLayout({ index, count, variant, density }: HandArcLayoutInput) {
  if (count <= 1) {
    return {
      angle: 0,
      offsetX: 0,
      offsetY: 0,
      zIndex: 1,
    }
  }

  const config = HAND_ARC_CONFIG[variant][density]
  const middle = (count - 1) / 2
  const distanceFromCenter = index - middle

  return {
    angle: Number((distanceFromCenter * config.rotate).toFixed(2)),
    offsetX: Number((distanceFromCenter * config.spread).toFixed(2)),
    offsetY: Number((Math.abs(distanceFromCenter) * config.curve).toFixed(2)),
    zIndex: index + 1,
  }
}