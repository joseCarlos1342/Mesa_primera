import type { StyleSpecification } from 'maplibre-gl'

/**
 * Paleta del mapa de la landing, tomada de DESIGN-player.md: tierra en paño verde,
 * vías principales en dorado y nombres en crema. Se aplica sobre Carto Dark Matter
 * (mismas teselas gratuitas, sin API key) recoloreando cada capa por su id.
 */
export const MAP_PALETTE = {
  land: '#0a2c20', // surface-leather
  landcover: '#0c3325',
  park: '#11402e',
  building: '#0f3a2a',
  buildingTop: '#134432',
  water: '#0a2e33',
  waterway: '#16505a',
  boundary: '#2b5a45',
  casing: '#051a14',
  roadMain: '#c5a059', // primary-muted
  roadSecondary: '#a8874c',
  roadMinor: '#3f7058',
  tunnel: '#24503d',
  rail: '#2b5a45',
  label: '#ece6d2',
  labelMuted: '#c9c2aa',
  waterLabel: '#a7cfc9',
  halo: '#05201a',
} as const

const P = MAP_PALETTE

function lineColorFor(id: string): string | null {
  if (id.startsWith('rail') || id.startsWith('tunnel_rail')) return P.rail
  if (id.endsWith('_case') || id.includes('_case_')) return P.casing
  if (id.startsWith('tunnel_')) return P.tunnel
  if (id.startsWith('road_') || id.startsWith('bridge_')) {
    if (/_(mot|trunk|pri)_/.test(id)) return P.roadMain
    if (id.includes('_sec_')) return P.roadSecondary
    return P.roadMinor
  }
  if (id.startsWith('aeroway')) return P.roadMinor
  if (id === 'waterway') return P.waterway
  if (id.startsWith('boundary')) return P.boundary
  return null
}

function fillColorFor(id: string): string | null {
  if (id === 'water') return P.water
  if (id.startsWith('park')) return P.park
  if (id === 'landcover') return P.landcover
  if (id.startsWith('landuse')) return P.landcover
  if (id === 'building') return P.building
  if (id === 'building-top') return P.buildingTop
  return null
}

function textColorFor(id: string): string {
  if (id.startsWith('water')) return P.waterLabel
  if (id.startsWith('roadname') || id.startsWith('place_')) return P.label
  return P.labelMuted
}

/** Devuelve una copia del estilo con la paleta de la landing. No modifica `style`. */
export function applyLandingPalette(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map((layer) => {
    const paint: Record<string, unknown> = { ...(('paint' in layer && layer.paint) || {}) }
    const { id } = layer

    if (layer.type === 'background') paint['background-color'] = P.land
    if (layer.type === 'line') {
      const color = lineColorFor(id)
      if (color) paint['line-color'] = color
    }
    if (layer.type === 'fill') {
      const color = fillColorFor(id)
      if (color) paint['fill-color'] = color
      if ('fill-outline-color' in paint) paint['fill-outline-color'] = P.land
    }
    if (layer.type === 'symbol' && paint['text-color'] !== 'transparent') {
      paint['text-color'] = textColorFor(id)
      paint['text-halo-color'] = P.halo
      paint['text-halo-width'] = 1.6
    }

    return { ...layer, paint } as typeof layer
  })

  return { ...style, layers }
}
