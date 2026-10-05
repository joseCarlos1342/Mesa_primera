'use client'

import { useEffect, useRef } from 'react'
import { LOCAL_LOCATION } from './landingLocation'
// CSS de MapLibre — importado aquí para que Next.js lo incluya en el bundle del cliente
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — maplibre-gl no incluye declaraciones de tipo para su CSS
import 'maplibre-gl/dist/maplibre-gl.css'

/* ── Constants ──────────────────────────────────────────────────── */

export { LOCAL_LOCATION }

/* Carto Positron — free, no API key required, light/minimalist */
const CARTO_STYLE =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

/* MapLibre v6 necesita su worker servido aparte (scripts/copy-maplibre-worker.mjs lo copia a public/).
   Sin esto el mapa se monta pero nunca descarga las teselas: no se ven calles. */
export const MAPLIBRE_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs'

/* ── Component ──────────────────────────────────────────────────── */

export function LocationMapInner() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let map: import('maplibre-gl').Map | null = null
    // La importación es asíncrona: si el efecto se limpia antes (StrictMode, navegación rápida),
    // no se debe crear el mapa; si no, quedan dos instancias superpuestas en el mismo contenedor.
    let cancelled = false

    async function init() {
      const maplibre = await import('maplibre-gl')

      if (cancelled || !containerRef.current) return

      maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL)

      map = new maplibre.Map({
        container: containerRef.current,
        style: CARTO_STYLE,
        center: [LOCAL_LOCATION.lng, LOCAL_LOCATION.lat],
        zoom: 16,
        attributionControl: false,
      })

      map.addControl(
        new maplibre.AttributionControl({ compact: true }),
        'bottom-right',
      )
      map.addControl(new maplibre.NavigationControl(), 'top-right')

      // El marcador es HTML y no depende del estilo: se agrega de inmediato, sin esperar 'load'.
      {
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
            <p style="font-weight:700;margin:0 0 4px;color:#1a1a1a;font-size:13px">${LOCAL_LOCATION.name}</p>
            <p style="margin:0;color:#555;font-size:12px">${LOCAL_LOCATION.address}</p>
          </div>`,
        )

        new maplibre.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([LOCAL_LOCATION.lng, LOCAL_LOCATION.lat])
          .setPopup(popup)
          .addTo(map)
      }
    }

    init().catch(console.error)

    return () => {
      cancelled = true
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
