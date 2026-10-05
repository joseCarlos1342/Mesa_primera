import { render, screen, waitFor } from '@testing-library/react'

import { LocationMapInner, MARKER_HEIGHT, createCardMarker } from '../LocationMap'

const mapOnMock = jest.fn()
const mapRemoveMock = jest.fn()
const addControlMock = jest.fn()
const markerSetLngLatMock = jest.fn().mockReturnThis()
const markerSetPopupMock = jest.fn().mockReturnThis()
const markerAddToMock = jest.fn()
const popupSetHtmlMock = jest.fn().mockReturnThis()
const setWorkerUrlMock = jest.fn()
const setStyleMock = jest.fn()

jest.mock('maplibre-gl', () => ({
  __esModule: true,
  setWorkerUrl: setWorkerUrlMock,
  Map: jest.fn().mockImplementation(() => ({
    addControl: addControlMock,
    setStyle: setStyleMock,
    on: mapOnMock,
    remove: mapRemoveMock,
  })),
  AttributionControl: jest.fn(),
  NavigationControl: jest.fn(),
  Popup: jest.fn().mockImplementation(() => ({
    setHTML: popupSetHtmlMock,
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: markerSetLngLatMock,
    setPopup: markerSetPopupMock,
    addTo: markerAddToMock,
  })),
}), { virtual: true })

describe('LocationMapInner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza la región del mapa con su etiqueta accesible', () => {
    render(<LocationMapInner />)

    expect(screen.getByRole('region', { name: /mapa mostrando la ubicación de primera riverada los 4 ases/i })).toBeInTheDocument()
  })

  it('inicializa maplibre, agrega controles y limpia el mapa al desmontar', async () => {
    const { unmount } = render(<LocationMapInner />)

    await waitFor(() => {
      expect(addControlMock).toHaveBeenCalledTimes(2)
    })

    expect(setWorkerUrlMock).toHaveBeenCalledWith('/maplibre/maplibre-gl-worker.mjs')
    const [styleUrl, styleOptions] = setStyleMock.mock.calls[0]
    expect(styleUrl).toContain('dark-matter-gl-style')
    const recolored = styleOptions.transformStyle(undefined, {
      version: 8,
      sources: {},
      layers: [{ id: 'background', type: 'background', paint: {} }],
    })
    expect(recolored.layers[0].paint['background-color']).toBe('#0a2c20')
    expect(markerSetLngLatMock).toHaveBeenCalledWith([-75.2866714, 2.9268522])
    expect(markerSetPopupMock).toHaveBeenCalled()
    expect(markerAddToMock).toHaveBeenCalled()

    unmount()

    expect(mapRemoveMock).toHaveBeenCalled()
  })

  it('no crea el mapa si se desmonta antes de que cargue maplibre (evita mapas duplicados)', async () => {
    const maplibre = jest.requireMock('maplibre-gl') as { Map: jest.Mock }
    const { unmount } = render(<LocationMapInner />)
    unmount()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(maplibre.Map).not.toHaveBeenCalled()
    expect(markerAddToMock).not.toHaveBeenCalled()
  })

  it('usa como marcador el As de Oros en miniatura con su punta, accesible por nombre', () => {
    const marker = createCardMarker('Primera Riverada los 4 Ases')

    expect(marker).toHaveAttribute('role', 'img')
    expect(marker).toHaveAttribute('aria-label', 'Primera Riverada los 4 Ases')
    const card = marker.querySelector('img') as HTMLImageElement
    expect(card.getAttribute('src')).toBe('/cards/01-oros.webp?v=4')
    expect(card.alt).toBe('')
    expect(card.width).toBe(40)
    expect(card.height).toBe(61)
    expect(marker.children).toHaveLength(3)
    expect(MARKER_HEIGHT).toBe(79)
  })
})
