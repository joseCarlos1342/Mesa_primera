import { getAvatarSvg } from '@/utils/avatars'

interface PlayerAvatarProps {
  /** Id de avatar del catálogo (`as-oros`…) o URL de imagen. */
  readonly avatar?: string | null
  readonly name?: string | null
  /** Lado en px. */
  readonly size?: number
  readonly className?: string
}

/** Avatar redondo con aro de latón: SVG del catálogo, foto o inicial. */
export function PlayerAvatar({ avatar, name, size = 44, className = '' }: PlayerAvatarProps) {
  const svg = getAvatarSvg(avatar)
  const initial = (name ?? '').replace(/^@/, '').trim().charAt(0).toUpperCase() || 'J'
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0a2c20] shadow-[inset_0_0_0_1.5px_rgba(197,160,89,0.75),0_4px_10px_-4px_rgba(0,0,0,0.8)] ${className}`}
    >
      {svg ? (
        <span className="block h-full w-full scale-[1.3]">{svg}</span>
      ) : avatar ? (
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display font-bold text-brand-gold-light" style={{ fontSize: size * 0.42 }}>
          {initial}
        </span>
      )}
    </span>
  )
}
