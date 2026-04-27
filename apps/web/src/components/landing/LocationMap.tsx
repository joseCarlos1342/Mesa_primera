'use client'

import { useEffect, useRef } from 'react'
// CSS de MapLibre — importado aquí para que Next.js lo incluya en el bundle del cliente
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — maplibre-gl no incluye declaraciones de tipo para su CSS
import 'maplibre-gl/dist/maplibre-gl.css'

/* ── Constants ──────────────────────────────────────────────────── */

export const LOCAL_LOCATION = {
  lat: 2.9268522,
  lng: -75.2866714,
  address: 'Cra. 7 #06-87, Neiva, Huila',
  name: 'Primera Riverada los 4 Ases',
  gmapsPin: 'https://maps.google.com/maps?q=2.9268522,-75.2866714',
  gmapsDir:
    'https://maps.google.com/maps/dir/?api=1&destination=2.9268522,-75.2866714',
} as const

/* Carto Dark Matter — free, no API key required */
const CARTO_DARK_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

/* ── Component ──────────────────────────────────────────────────── */

export function LocationMapInner() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let map: import('maplibre-gl').Map | null = null

    async function init() {
      const maplibre = await import('maplibre-gl')

      if (!containerRef.current) return

      map = new maplibre.Map({
        container: containerRef.current,
        style: CARTO_DARK_STYLE,
        center: [LOCAL_LOCATION.lng, LOCAL_LOCATION.lat],
        zoom: 16,
        attributionControl: false,
      })

      map.addControl(
        new maplibre.AttributionControl({ compact: true }),
        'bottom-right',
      )
      map.addControl(new maplibre.NavigationControl(), 'top-right')

      map.on('load', () => {
        if (!map) return

        /* Custom gold marker element */
        const el = document.createElement('div')
        el.className = 'location-marker'
        el.setAttribute('aria-label', LOCAL_LOCATION.name)
        el.style.cssText = [
          'width:40px',
          'height:40px',
          'background:linear-gradient(135deg,#f0d78c,#e2b044)',
          'border:3px solid #8b6b2e',
          'border-radius:50% 50% 50% 0',
          'transform:rotate(-45deg)',
          'box-shadow:0 4px 16px rgba(226,176,68,0.5)',
          'cursor:pointer',
        ].join(';')

        /* Popup con nombre y dirección */
        const popup = new maplibre.Popup({
          offset: 32,
          closeButton: false,
          maxWidth: '240px',
        }).setHTML(
          `<div style="font-family:system-ui,sans-serif;padding:8px 4px">
            <p style="font-weight:700;margin:0 0 4px;color:#e2b044;font-size:13px">${LOCAL_LOCATION.name}</p>
            <p style="margin:0;color:#d1d5db;font-size:12px">${LOCAL_LOCATION.address}</p>
          </div>`,
        )

        new maplibre.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([LOCAL_LOCATION.lng, LOCAL_LOCATION.lat])
          .setPopup(popup)
          .addTo(map)

        /* Abre el popup automáticamente */
        popup.addTo(map).setLngLat([LOCAL_LOCATION.lng, LOCAL_LOCATION.lat])
      })
    }

    init().catch(console.error)

    return () => {
      map?.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-brand-gold/20"
      style={{ height: '380px' }}
      role="region"
      aria-label={`Mapa mostrando la ubicación de ${LOCAL_LOCATION.name}`}
    />
  )
}
