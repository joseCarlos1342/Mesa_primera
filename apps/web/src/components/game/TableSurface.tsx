import { formatCurrency } from '@/utils/format'

/* Superficie y centro de la mesa compartidos por la partida (`Board`) y la
   repetición (`ReplayBoard`). Un cambio aquí se ve igual en ambos lados. */

export function getPotValueSizeClass(amount: number): string {
  const visibleCharacters = formatCurrency(amount).replace(/\s/g, '').length

  if (visibleCharacters >= 11) return 'text-[12px] md:text-[18px]'
  if (visibleCharacters >= 9) return 'text-[14px] md:text-[20px]'
  return 'text-[16px] md:text-[22px]'
}

/** Base de nogal, viñeta, canto, paño y filete (capas absolutas, sin interacción). */
export function TableSurface() {
  return (
    <>
      {/* Base de nogal: las vetas quedan visibles en las esquinas y el perímetro. */}
      <div
        data-testid="table-wood-base"
        className="absolute inset-0 bg-surface-wood pointer-events-none"
        style={{
          backgroundColor: '#120806',
          backgroundImage: [
            'radial-gradient(ellipse at 50% -20%, rgba(168, 82, 42, 0.3) 0%, transparent 54%)',
            'repeating-linear-gradient(7deg, rgba(255, 190, 118, 0.08) 0 1px, transparent 1px 46px)',
            'url("/textures/noise.png")',
          ].join(', '),
          backgroundBlendMode: 'normal, normal, soft-light',
          backgroundSize: 'auto, auto, 128px 128px',
        }}
      />

      {/* Viñeta exterior para que la madera parezca una base profunda. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, 0.58) 100%)' }}
      />

      {/* Canto elevado de la mesa. */}
      <div
        data-testid="table-wood-rim"
        className="absolute inset-[2.25%] rounded-[50%] pointer-events-none"
        style={{
          border: 'clamp(8px, 1.5vw, 20px) solid var(--color-surface-wood-rim, #35180f)',
          boxShadow: [
            '0 18px 30px rgba(0, 0, 0, 0.62)',
            'inset 0 1px 0 rgba(240, 170, 105, 0.34)',
            'inset 0 -5px 0 rgba(0, 0, 0, 0.42)',
          ].join(', '),
        }}
      />

      {/* Fieltro: volumen central, luz suave y trama discreta sin textura remota. */}
      <div
        data-testid="table-felt-surface"
        className="absolute inset-[4.25%] bg-surface-leather rounded-[50%] overflow-hidden pointer-events-none"
        style={{
          backgroundColor: '#0a2c20',
          backgroundImage: [
            'radial-gradient(ellipse at 50% 35%, rgba(69, 153, 108, 0.42) 0%, rgba(26, 94, 63, 0.34) 43%, rgba(2, 26, 16, 0.92) 100%)',
            'repeating-radial-gradient(ellipse at 18% 32%, rgba(148, 204, 169, 0.07) 0 1px, transparent 1px 11px)',
            'url("/textures/noise.png")',
          ].join(', '),
          backgroundBlendMode: 'normal, soft-light, soft-light',
          backgroundSize: 'auto, auto, 128px 128px',
          boxShadow: 'inset 0 0 72px rgba(0, 0, 0, 0.72), 0 5px 14px rgba(0, 0, 0, 0.65)',
        }}
      />

      {/* Filete interior que separa visualmente el fieltro del nogal. */}
      <div
        className="absolute inset-[4.25%] rounded-[50%] border border-[#d4af37]/35 pointer-events-none"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255, 226, 153, 0.18)' }}
      />
    </>
  )
}

const SUIT_FILE: Record<string, string> = { O: 'oros', C: 'copas', E: 'espadas', B: 'bastos' }

/** Ruta de la carta del fondo a partir de `7-O` u `7-oros`. */
export function bottomCardSrc(card: string | null | undefined): string | null {
  if (!card) return null
  const [value, suit] = card.split('-')
  if (!value || !suit) return null
  const file = SUIT_FILE[suit] ?? suit.toLowerCase()
  return `/cards/${value.padStart(2, '0')}-${file}.webp?v=4`
}

interface TablePotsProps {
  readonly pot: number
  readonly piquePot: number
  readonly bottomCard?: string | null
  /** Margen inferior del bloque central (la partida lo sube para dejar sitio al panel del jugador). */
  readonly className?: string
  /** Prefijo de `data-testid` (la repetición usa `replay-`). */
  readonly testIdPrefix?: string
}

/** Displays de Apuesta Principal y Apuesta Pique con el mazo y la carta del fondo en el centro. */
export function TablePots({ pot, piquePot, bottomCard, className = 'mb-12 lg:mb-20', testIdPrefix = '' }: TablePotsProps) {
  const bottomSrc = bottomCardSrc(bottomCard)
  return (
    <div data-testid={`${testIdPrefix}center-cluster`} className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none ${className}`}>
      <div className="relative flex items-center justify-center pointer-events-auto px-2 py-2 md:px-8 md:py-4">
        <div data-testid="pot-displays" className="relative z-10 flex items-center gap-1 md:gap-2">
          <div
            data-testid={`${testIdPrefix}pot-main`}
            className="relative flex h-[58px] w-[112px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#8b6b2e] bg-[#160b08]/95 px-1.5 text-center shadow-[0_10px_20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(240,170,105,0.28),inset_0_-5px_12px_rgba(0,0,0,0.65)] backdrop-blur-md md:h-[76px] md:w-[154px] md:rounded-[18px] md:px-2"
          >
            <div className="pointer-events-none absolute inset-[3px] rounded-[11px] border border-[#d4af37]/20 md:rounded-[15px]" />
            <span className="relative z-10 text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-[#fdf0a6]/80 md:text-xs md:tracking-[0.1em]">Apuesta Principal</span>
            <span className={`relative z-10 whitespace-nowrap font-mono font-black leading-none text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.35)] ${getPotValueSizeClass(pot)}`}>
              {formatCurrency(pot)}
            </span>
          </div>
          <div data-testid="deck-pedestal" aria-hidden="true" className="relative h-[58px] w-16 shrink-0 pointer-events-none md:h-[94px] md:w-[168px]" />
          <div
            data-testid={`${testIdPrefix}pot-pique`}
            className={`relative flex h-[58px] w-[112px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#8b6b2e] bg-[#160b08]/95 px-1.5 text-center shadow-[0_10px_20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(240,170,105,0.28),inset_0_-5px_12px_rgba(0,0,0,0.65)] backdrop-blur-md transition-opacity md:h-[76px] md:w-[154px] md:rounded-[18px] md:px-2 ${piquePot > 0 ? 'opacity-100' : 'opacity-55'}`}
          >
            <div className="pointer-events-none absolute inset-[3px] rounded-[11px] border border-[#d4af37]/20 md:rounded-[15px]" />
            <span className="relative z-10 text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-[#fdf0a6]/80 md:text-xs md:tracking-[0.1em]">Apuesta Pique</span>
            <span className={`relative z-10 whitespace-nowrap font-mono font-black leading-none text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.35)] ${getPotValueSizeClass(piquePot)}`}>
              {formatCurrency(piquePot)}
            </span>
          </div>
        </div>

        {/* Mazo central sobre el divisor, como un inserto físico de la mesa. */}
        <div id="deck-center" className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute h-9 w-6 translate-x-0.5 translate-y-0.5 rounded-md bg-[#0a0a0a] shadow-[2px_2px_15px_rgba(0,0,0,0.9)] md:h-24 md:w-16 md:translate-x-1.5 md:translate-y-1.5 md:rounded-lg" />
          <div className="absolute h-9 w-6 translate-x-[1px] translate-y-[1px] rounded-md bg-[#1a1a1a] md:h-24 md:w-16 md:translate-x-1 md:translate-y-1 md:rounded-lg" />
          <div data-testid="deck-card" className="relative z-10 h-9 w-6 overflow-hidden rounded-md border-[1.5px] border-[#d4af37]/40 bg-[url('/cards/dorso.svg')] bg-cover bg-center md:h-24 md:w-16 md:rounded-lg md:border-[2px]">
            <div className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] md:rounded-lg" />
            <div className="pointer-events-none absolute inset-0 rounded-md border border-white/10 md:rounded-lg" />
          </div>
          {bottomSrc && (
            <div data-testid="bottom-card" className="absolute left-[58%] top-1/2 z-[5] h-9 w-6 -translate-y-1/2 rotate-[8deg] overflow-hidden rounded-md border border-[#d4af37]/30 shadow-[0_4px_16px_rgba(0,0,0,0.7)] md:left-[58%] md:h-24 md:w-16 md:rounded-lg">
              <img src={bottomSrc} alt="" className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.4)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
