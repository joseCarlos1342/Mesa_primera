import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Mail, MapPin } from 'lucide-react'
import { PlayingCard } from '../PlayingCard'
import { type Card, cardId } from '../primeraHands'
import styles from '../landing.module.css'

const SOCIAL = {
  facebook: 'https://facebook.com/primerariveradalos4ases',
  instagram: 'https://instagram.com/primerariveradalos4ases',
  email: 'soporte@primerariveradalos4ases.com',
}

/** Los 4 ases, el guiño al nombre del club. */
const FOUR_ACES: readonly Card[] = [
  { rank: 1, suit: 'oros' },
  { rank: 1, suit: 'copas' },
  { rank: 1, suit: 'espadas' },
  { rank: 1, suit: 'bastos' },
]

export function ClosingTable() {
  return (
    <section aria-labelledby="cierre-title" className={`${styles.felt} ${styles.rim} px-5 py-24 sm:px-8 md:py-32`}>
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className={styles.fan} aria-hidden="true">
          {FOUR_ACES.map((card) => (
            <PlayingCard key={cardId(card)} card={card} sizes="(min-width: 768px) 140px, 18vw" decorative />
          ))}
        </div>
        <h2
          id="cierre-title"
          className="mt-14 font-display font-bold leading-[1] tracking-[-0.02em] text-text-premium [font-size:clamp(2.6rem,6vw,4.5rem)]"
        >
          Siéntate a <span className="italic text-brand-gold-light">la mesa</span>
        </h2>
        <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-[#d9d3bf]">
          Tu cuenta te espera con las mismas reglas que se juegan en el club.
        </p>
        <Link
          href="/register/player"
          className="group mt-9 inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-lg bg-brand-gold px-8 text-lg font-bold text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] transition-colors duration-200 hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2c20]"
        >
          Crear cuenta gratis
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

const socialLinkClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#8b6b2e]/60 text-[#d9d3bf] transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light'

const footerLinkClass =
  'inline-flex min-h-11 items-center text-base text-[#d9d3bf] transition-colors hover:text-brand-gold-light whitespace-nowrap'

export function LandingFooter({ address }: { address: string }) {
  return (
    <footer className="bg-[#0a0a0a] px-5 pb-10 pt-16 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-start md:gap-16">
          <div>
            <p className="font-display text-2xl font-bold text-text-premium">Primera Riverada los 4 Ases</p>
            <p className="mt-2 text-base text-[#bdb7a6]">Club de cartas, dominó y entretenimiento.</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-base text-[#bdb7a6]">
              <MapPin className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
              {address}
            </p>
          </div>

          <nav aria-label="Enlaces del sitio" className="grid grid-cols-2 gap-x-8 md:grid-cols-1">
            <Link href="/login/player" className={footerLinkClass}>Iniciar sesión</Link>
            <Link href="/register/player" className={footerLinkClass}>Crear cuenta</Link>
            <Link href="/privacy" className={footerLinkClass}>Política de privacidad</Link>
            <Link href="/terms" className={footerLinkClass}>Términos y condiciones</Link>
          </nav>

          <ul className="m-0 flex list-none gap-3 p-0" aria-label="Redes sociales">
            <li>
              <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook de Primera Riverada los 4 Ases" className={socialLinkClass}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </a>
            </li>
            <li>
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Primera Riverada los 4 Ases" className={socialLinkClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
            </li>
            <li>
              <a href={`mailto:${SOCIAL.email}`} aria-label="Correo electrónico de contacto" className={socialLinkClass}>
                <Mail className="h-5 w-5" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>

        <div className={`${styles.brassRule} mt-12`} aria-hidden="true" />

        <div className="mt-8 flex flex-col items-center justify-between gap-5 md:flex-row">
          <p className="text-sm text-[#a0a0b0]">
            © {new Date().getFullYear()} Primera Riverada los 4 Ases. Todos los derechos reservados.
          </p>
          <a
            href="https://gnesis.group"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Desarrollado por Gnesis.group"
            className="flex min-h-11 items-center gap-3 text-[#a0a0b0] transition-colors hover:text-brand-gold-light"
          >
            <span className="text-xs uppercase tracking-[0.2em]">Desarrollado por</span>
            <Image src="/Genesis/Recurso 64.svg" alt="Gnesis.group" width={108} height={20} className="h-5 w-auto" />
          </a>
        </div>

        <p className="sr-only">
          Primera Riverada los 4 Ases — club de cartas y tomadero en Neiva, Huila. También conocido como Primera Riverada
          Dario, mesa de juego Dario, Los 4 Ases Neiva, juego de cartas Primera online. Juega Primera Riverada en tiempo
          real desde cualquier lugar.
        </p>
      </div>
    </footer>
  )
}
