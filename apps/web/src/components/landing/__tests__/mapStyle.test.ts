import type { StyleSpecification } from 'maplibre-gl'

import { MAP_PALETTE, applyLandingPalette } from '../mapStyle'

const baseStyle = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0e0e0e' } },
    { id: 'landcover', type: 'fill', source: 'carto', 'source-layer': 'landcover', paint: { 'fill-color': '#111' } },
    { id: 'park_national_park', type: 'fill', source: 'carto', paint: { 'fill-color': '#111' } },
    { id: 'landuse_residential', type: 'fill', source: 'carto', paint: { 'fill-color': '#111' } },
    { id: 'water', type: 'fill', source: 'carto', paint: { 'fill-color': '#2C353C' } },
    { id: 'water_shadow', type: 'fill', source: 'carto', paint: { 'fill-color': 'transparent' } },
    { id: 'building', type: 'fill', source: 'carto', paint: { 'fill-color': '#222' } },
    { id: 'building-top', type: 'fill', source: 'carto', paint: { 'fill-color': '#333', 'fill-outline-color': '#0e0e0e' } },
    { id: 'waterway', type: 'line', source: 'carto', paint: { 'line-color': '#333' } },
    { id: 'boundary_state', type: 'line', source: 'carto', paint: { 'line-color': '#333' } },
    { id: 'aeroway-runway', type: 'line', source: 'carto', paint: { 'line-color': '#111' } },
    { id: 'road_pri_case_noramp', type: 'line', source: 'carto', paint: { 'line-color': '#232323' } },
    { id: 'tunnel_minor_fill', type: 'line', source: 'carto', paint: { 'line-color': '#161616' } },
    { id: 'tunnel_rail', type: 'line', source: 'carto', paint: { 'line-color': '#1a1a1a' } },
    { id: 'road_mot_fill_noramp', type: 'line', source: 'carto', paint: { 'line-color': '#494949' } },
    { id: 'road_sec_fill_noramp', type: 'line', source: 'carto', paint: { 'line-color': '#414758' } },
    { id: 'road_minor_fill', type: 'line', source: 'carto', paint: { 'line-color': '#414758' } },
    { id: 'bridge_trunk_fill', type: 'line', source: 'carto', paint: { 'line-color': '#414758' } },
    { id: 'some_other_line', type: 'line', source: 'carto', paint: { 'line-color': '#123456' } },
    { id: 'roadname_minor', type: 'symbol', source: 'carto', paint: { 'text-color': '#b5b4b4', 'text-halo-color': '#111' } },
    { id: 'watername_lake', type: 'symbol', source: 'carto', paint: { 'text-color': '#9b9b9b' } },
    { id: 'poi_park', type: 'symbol', source: 'carto', paint: { 'text-color': '#515151' } },
    { id: 'housenumber', type: 'symbol', source: 'carto', paint: { 'text-color': 'transparent' } },
    { id: 'no_paint', type: 'symbol', source: 'carto' },
  ],
} as unknown as StyleSpecification

function paintOf(style: StyleSpecification, id: string): Record<string, unknown> {
  const layer = style.layers.find((item) => item.id === id) as { paint?: Record<string, unknown> }
  return layer.paint ?? {}
}

describe('applyLandingPalette', () => {
  const styled = applyLandingPalette(baseStyle)

  it('pinta fondo, coberturas, agua y edificios con la paleta de la landing', () => {
    expect(paintOf(styled, 'background')['background-color']).toBe(MAP_PALETTE.land)
    expect(paintOf(styled, 'landcover')['fill-color']).toBe(MAP_PALETTE.landcover)
    expect(paintOf(styled, 'landuse_residential')['fill-color']).toBe(MAP_PALETTE.landcover)
    expect(paintOf(styled, 'park_national_park')['fill-color']).toBe(MAP_PALETTE.park)
    expect(paintOf(styled, 'water')['fill-color']).toBe(MAP_PALETTE.water)
    expect(paintOf(styled, 'water_shadow')['fill-color']).toBe('transparent')
    expect(paintOf(styled, 'building')['fill-color']).toBe(MAP_PALETTE.building)
    expect(paintOf(styled, 'building-top')).toMatchObject({
      'fill-color': MAP_PALETTE.buildingTop,
      'fill-outline-color': MAP_PALETTE.land,
    })
  })

  it('jerarquiza las vías: principales en dorado, secundarias en bronce y menores en verde', () => {
    expect(paintOf(styled, 'road_mot_fill_noramp')['line-color']).toBe(MAP_PALETTE.roadMain)
    expect(paintOf(styled, 'bridge_trunk_fill')['line-color']).toBe(MAP_PALETTE.roadMain)
    expect(paintOf(styled, 'road_sec_fill_noramp')['line-color']).toBe(MAP_PALETTE.roadSecondary)
    expect(paintOf(styled, 'road_minor_fill')['line-color']).toBe(MAP_PALETTE.roadMinor)
    expect(paintOf(styled, 'aeroway-runway')['line-color']).toBe(MAP_PALETTE.roadMinor)
    expect(paintOf(styled, 'road_pri_case_noramp')['line-color']).toBe(MAP_PALETTE.casing)
    expect(paintOf(styled, 'tunnel_minor_fill')['line-color']).toBe(MAP_PALETTE.tunnel)
    expect(paintOf(styled, 'tunnel_rail')['line-color']).toBe(MAP_PALETTE.rail)
    expect(paintOf(styled, 'waterway')['line-color']).toBe(MAP_PALETTE.waterway)
    expect(paintOf(styled, 'boundary_state')['line-color']).toBe(MAP_PALETTE.boundary)
    expect(paintOf(styled, 'some_other_line')['line-color']).toBe('#123456')
  })

  it('usa textos crema con halo oscuro legible y respeta las etiquetas ocultas', () => {
    expect(paintOf(styled, 'roadname_minor')).toMatchObject({
      'text-color': MAP_PALETTE.label,
      'text-halo-color': MAP_PALETTE.halo,
      'text-halo-width': 1.6,
    })
    expect(paintOf(styled, 'watername_lake')['text-color']).toBe(MAP_PALETTE.waterLabel)
    expect(paintOf(styled, 'poi_park')['text-color']).toBe(MAP_PALETTE.labelMuted)
    expect(paintOf(styled, 'no_paint')['text-color']).toBe(MAP_PALETTE.labelMuted)
    expect(paintOf(styled, 'housenumber')['text-color']).toBe('transparent')
  })

  it('no modifica el estilo original', () => {
    expect(paintOf(baseStyle, 'background')['background-color']).toBe('#0e0e0e')
  })
})
