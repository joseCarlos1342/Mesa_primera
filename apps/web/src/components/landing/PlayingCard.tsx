import Image from 'next/image'
import { cardImage, cardName, type Card } from './primeraHands'
import styles from './landing.module.css'

export const CARD_BACK_SRC = '/images/card-back-web.webp'

interface PlayingCardProps {
  readonly card: Card
  /** Atributo `sizes` de next/image para el ancho renderizado. */
  readonly sizes: string
  /** Si es decorativa, se oculta a lectores de pantalla (el texto cercano ya la describe). */
  readonly decorative?: boolean
  /** Reparte la carta boca abajo y la voltea (solo CSS; desactivado con reduced-motion). */
  readonly deal?: boolean
  /** Orden de reparto, define el retardo de la animación. */
  readonly dealIndex?: number
  readonly loading?: 'eager' | 'lazy'
  /** Resaltada en el tablero (parte de la mano que se explica). */
  readonly lit?: boolean
  readonly className?: string
}

export function PlayingCard({
  card,
  sizes,
  decorative = false,
  deal = false,
  dealIndex = 0,
  loading = 'lazy',
  lit = false,
  className = '',
}: PlayingCardProps) {
  return (
    <span
      className={`${styles.card} ${deal ? styles.cardDeal : ''} ${className}`}
      style={deal ? ({ '--deal-i': dealIndex } as React.CSSProperties) : undefined}
      data-card={`${card.rank}-${card.suit}`}
      data-lit={lit || undefined}
      aria-hidden={decorative || undefined}
    >
      <span className={styles.cardInner}>
        <Image
          src={cardImage(card)}
          alt={decorative ? '' : cardName(card)}
          width={416}
          height={638}
          sizes={sizes}
          loading={loading}
          className={styles.cardFace}
        />
        {deal && (
          <Image
            src={CARD_BACK_SRC}
            alt=""
            width={416}
            height={638}
            sizes={sizes}
            loading={loading}
            className={styles.cardBack}
          />
        )}
      </span>
    </span>
  )
}
