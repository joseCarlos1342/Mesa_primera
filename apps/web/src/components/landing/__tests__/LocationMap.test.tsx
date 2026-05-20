import { render, screen, waitFor } from '@testing-library/react'

import { LocationMapInner } from '../LocationMap'

const mapOnMock = jest.fn((event: string, callback: () => void) => {
  if (event === 'load') callback()
})
const mapRemoveMock = jest.fn()
const addControlMock = jest.fn()
const markerSetLngLatMock = jest.fn().mockReturnThis()
const markerSetPopupMock = jest.fn().mockReturnThis()
const markerAddToMock = jest.fn()
const popupSetHtmlMock = jest.fn().mockReturnThis()

jest.mock('maplibre-gl', () => ({
  __esModule: true,
  Map: jest.fn().mockImplementation(() => ({
    addControl: addControlMock,
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
}))

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

    expect(markerSetLngLatMock).toHaveBeenCalledWith([-75.2866714, 2.9268522])
    expect(markerSetPopupMock).toHaveBeenCalled()
    expect(markerAddToMock).toHaveBeenCalled()

    unmount()

    expect(mapRemoveMock).toHaveBeenCalled()
  })
})
