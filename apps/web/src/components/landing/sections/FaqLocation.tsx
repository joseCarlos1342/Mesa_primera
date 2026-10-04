'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Navigation, Plus } from 'lucide-react'
import { LOCAL_LOCATION } from '@/components/landing/landingLocation'
import styles from '../landing.module.css'

const LocationMap = dynamic(
  () => import('@/components/landing/LocationMap').then((m) => ({ default: m.LocationMapInner })),
  { ssr: false },
)

/** Debe coincidir con el JSON-LD FAQPage de `app/layout.tsx`. */
export const FAQ_ITEMS = [
  {
    q: '¿Dónde queda Primera Riverada los 4 Ases?',
    a: 'Nuestro establecimiento está en Neiva, Huila (Cra. 7 #06-87), y también puedes jugar online en tiempo real desde la plataforma. Primera Riverada Neiva — el club de cartas y tomadero de la región.',
  },
  {
    q: '¿Puedo tomar bebidas y jugar en el mismo lugar?',
    a: 'Sí. El club combina mesas de juego con zona de bebidas para una experiencia social completa.',
  },
  {
    q: '¿Cómo empiezo a jugar en línea?',
    a: 'Crea tu cuenta, valida tu número de celular y entra a una mesa activa de Primera con otros jugadores.',
  },
  {
    q: '¿Dónde reviso reglas y seguridad del sitio?',
    a: 'Puedes revisar reglas del juego, políticas de seguridad y términos desde las páginas públicas oficiales.',
  },
]

const MAP_HEIGHT = 380

function LazyLocationMap() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="min-h-[380px]">
      {visible ? (
        <LocationMap />
      ) : (
        <div
          className="flex w-full items-center justify-center rounded-2xl border border-[#8b6b2e]/50 bg-[#0a2c20]"
          style={{ height: `${MAP_HEIGHT}px` }}
          role="region"
          aria-label="Mapa de ubicación (cargando)"
        >
          <span className="text-base text-[#d9d3bf]">Cargando mapa…</span>
        </div>
      )}
    </div>
  )
}

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-[#0a0a0a] px-5 py-24 sm:px-8 md:py-32 lg:px-14">
      <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div>
          <h2
            id="faq-title"
            className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl"
          >
            Preguntas <span className="italic text-brand-gold-light">frecuentes</span>
          </h2>
          <p className="mt-4 max-w-[38ch] text-lg leading-relaxed text-[#d9d3bf]">
            Respuestas rápidas para jugadores que buscan un buen sitio para tomar bebidas y jugar Primera en Neiva.
          </p>
        </div>

        <div className="border-b border-[#8b6b2e]/45">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className={`${styles.faqItem} group border-t border-[#8b6b2e]/45`}>
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-6 py-5 text-left text-xl font-bold text-text-premium transition-colors hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light rounded-sm">
                <h3 className="m-0 text-xl font-bold">{item.q}</h3>
                <Plus className={`${styles.faqIcon} h-6 w-6 shrink-0 text-brand-gold`} aria-hidden="true" />
              </summary>
              <p className="max-w-[62ch] pb-6 text-lg leading-relaxed text-[#d9d3bf]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LocationSection() {
  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className={`${styles.wood} px-5 py-24 sm:px-8 md:py-32 lg:px-14`}>
      <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-20">
        <div>
          <h2
            id="ubicacion-title"
            className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl"
          >
            Cómo <span className="italic text-brand-gold-light">llegarnos</span>
          </h2>
          <p className="mt-4 max-w-[36ch] text-lg leading-relaxed text-[#d9d3bf]">
            Visítanos en nuestro establecimiento en Neiva, Huila.
          </p>
          <p className="mt-6 flex items-start gap-2 text-xl font-semibold text-text-premium">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-brand-gold" aria-hidden="true" />
            {LOCAL_LOCATION.address}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
            <a
              href="https://maps.google.com/maps/dir/?api=1&destination=2.9268522,-75.2866714"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-lg bg-brand-gold px-7 text-lg font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#120806]"
            >
              <Navigation className="h-5 w-5" aria-hidden="true" />
              Cómo llegar
            </a>
            <a
              href="https://maps.google.com/maps?q=2.9268522,-75.2866714"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-lg border border-[#c5a059]/70 px-7 text-lg font-bold text-brand-gold-light transition-colors hover:border-brand-gold hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              <MapPin className="h-5 w-5" aria-hidden="true" />
              Ver en Google Maps
            </a>
          </div>
        </div>

        <LazyLocationMap />
      </div>
    </section>
  )
}
