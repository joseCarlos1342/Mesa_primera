'use client'

import { useEffect, useRef } from 'react'
import { LOCAL_LOCATION } from './landingLocation'
import { applyLandingPalette } from './mapStyle'
// CSS de MapLibre — importado aquí para que Next.js lo incluya en el bundle del cliente
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — maplibre-gl no incluye declaraciones de tipo para su CSS
import 'maplibre-gl/dist/maplibre-gl.css'

/* ── Constants ──────────────────────────────────────────────────── */

export { LOCAL_LOCATION }

/* Carto Dark Matter — gratis, sin API key. Se recolorea con la paleta de la landing (mapStyle.ts). */
export const CARTO_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

/* MapLibre v6 necesita su worker servido aparte (scripts/copy-maplibre-worker.mjs lo copia a public/).
   Sin esto el mapa se monta pero nunca descarga las teselas: no se ven calles. */
export const MAPLIBRE_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs'

/* ── Marcador: As de Oros (los 4 Ases) con punta dorada ─────────── */

const MARKER_CARD_SRC = '/cards/01-oros.webp?v=4'
const MARKER_CARD_WIDTH = 40
const MARKER_CARD_HEIGHT = Math.round((MARKER_CARD_WIDTH * 638) / 416) // 61, proporción real de la carta
/** Alto total (carta + bordes + punta + sombra); el popup se abre justo encima. */
export const MARKER_HEIGHT = MARKER_CARD_HEIGHT + 4 + 9 + 5

/** Crea el marcador HTML: una carta en miniatura sobre una punta que señala el local. */
export function createCardMarker(label: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'location-marker'
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', label)
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'

  const card = document.createElement('img')
  card.src = MARKER_CARD_SRC
  card.alt = ''
  card.width = MARKER_CARD_WIDTH
  card.height = MARKER_CARD_HEIGHT
  card.draggable = false
  card.style.cssText = [
    'display:block',
    'background:#fff',
    'border:2px solid #e2b044',
    'border-radius:5px',
    'box-shadow:0 6px 14px rgba(0,0,0,0.55)',
    'transform:rotate(-6deg)',
  ].join(';')

  const pointer = document.createElement('div')
  pointer.style.cssText =
    'width:0;height:0;margin-top:-1px;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #e2b044'

  const ground = document.createElement('div')
  ground.style.cssText =
    'width:16px;height:5px;border-radius:50%;background:radial-gradient(rgba(0,0,0,0.5),transparent 70%)'

  el.append(card, pointer, ground)
  return el
}

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
        center: [LOCAL_LOCATION.lng, LOCAL_LOCATION.lat],
        zoom: 16,
        attributionControl: false,
      })
      map.setStyle(CARTO_STYLE, { transformStyle: (_previous, next) => applyLandingPalette(next) })

      map.addControl(
        new maplibre.AttributionControl({ compact: true }),
        'bottom-right',
      )
      map.addControl(new maplibre.NavigationControl(), 'top-right')

      // El marcador es HTML y no depende del estilo: se agrega de inmediato, sin esperar 'load'.
      {
        const el = createCardMarker(LOCAL_LOCATION.name)

        /* Popup con nombre y dirección */
        const popup = new maplibre.Popup({
          offset: MARKER_HEIGHT + 6,
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
      className="w-full rounded-2xl overflow-hidden border border-brand-gold/20 bg-[#0a2c20]"
      style={{ height: '380px' }}
      role="region"
      aria-label={`Mapa mostrando la ubicación de ${LOCAL_LOCATION.name}`}
    />
  )
}
