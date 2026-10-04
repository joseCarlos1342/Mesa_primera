import Image from 'next/image'
import { Coffee, Dices, Grid2x2, MapPin, Spade, Wine } from 'lucide-react'
import styles from '../landing.module.css'

const SERVICES = [
  { icon: Spade, label: 'Juego de Primera', desc: 'Mesas activas de cartas Primera en tiempo real.' },
  { icon: Dices, label: 'Dominó', desc: 'Partidas de dominó presenciales y con amigos.' },
  { icon: Grid2x2, label: 'Mesas de parqués', desc: 'Juegos de mesa y parqués para pasar el rato.' },
  { icon: Coffee, label: 'Bebidas sin alcohol', desc: 'Café, jugos y refrescos para tu partida.' },
  { icon: Wine, label: 'Bebidas con alcohol', desc: 'Cervezas, licores y cocteles disponibles.' },
]

export interface ClubPhoto {
  readonly src: string
  readonly alt: string
  readonly width: number
  readonly height: number
}

/** Fotos reales del establecimiento. Vacío hasta que el club las aporte. */
export const CLUB_PHOTOS: readonly ClubPhoto[] = []

export function ClubPhotos({ photos }: { photos: readonly ClubPhoto[] }) {
  if (photos.length === 0) return null

  return (
    <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="club-photos">
      {photos.map((photo) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          className="h-auto w-full rounded-xl object-cover"
        />
      ))}
    </div>
  )
}

interface ClubSectionProps {
  readonly address: string
  readonly photos?: readonly ClubPhoto[]
}

export function ClubSection({ address, photos = CLUB_PHOTOS }: ClubSectionProps) {
  return (
    <section id="club" aria-labelledby="club-title" className={`${styles.wood} px-5 py-24 sm:px-8 md:py-32 lg:px-14`}>
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            <h2
              id="club-title"
              className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl"
            >
              El club en <span className="italic text-brand-gold-light">Neiva</span>
            </h2>
            <div className="mt-8 max-w-[62ch] space-y-5 text-lg leading-relaxed text-[#d9d3bf]">
              <p>
                Somos un club de entretenimiento con tradición en el juego de cartas
                <strong className="font-semibold text-text-premium"> Primera</strong> y dominó. Conocido también como
                <strong className="font-semibold text-text-premium"> Primera Riverada Dario</strong> o la mesa de Primera de
                Neiva, con años de experiencia reuniendo jugadores, ahora también ofrecemos partidas online en tiempo real
                para que disfrutes desde cualquier lugar.
              </p>
              <p>
                Nuestro compromiso es el <strong className="font-semibold text-text-premium">fair play</strong>, la
                seguridad de tus fondos y una comunidad de jugadores respetuosa.
              </p>
            </div>
            <a
              href="#ubicacion"
              className="mt-8 inline-flex min-h-11 items-center gap-2 text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold"
            >
              <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
              {address}
            </a>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[#c5a059]">En el establecimiento</h3>
            <ul className="mt-5 list-none p-0">
              {SERVICES.map((service) => (
                <li key={service.label} className="flex gap-4 border-t border-[#8b6b2e]/45 py-5 last:border-b">
                  <service.icon className="mt-0.5 h-6 w-6 shrink-0 text-brand-gold" strokeWidth={1.6} aria-hidden="true" />
                  <div>
                    <p className="text-xl font-bold text-text-premium">{service.label}</p>
                    <p className="mt-1 text-base text-[#bdb7a6]">{service.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ClubPhotos photos={photos} />
      </div>
    </section>
  )
}
