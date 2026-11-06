'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookOpen, Camera, ChevronRight, FileText, Fingerprint, MessageCircle } from 'lucide-react';
import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import { Section, playerTextLink } from '@/components/player/PlayerUI';
import type { PlayerStats } from '@/app/actions/stats';

/* ── Identidad ─────────────────────────────────────────────── */

interface ProfileIdentityProps {
  readonly username: string;
  readonly phone: string;
  readonly avatarUrl: string;
  readonly busy: boolean;
  readonly onPickAvatar: () => void;
}

export function ProfileIdentity({ username, phone, avatarUrl, busy, onPickAvatar }: ProfileIdentityProps) {
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <PlayerAvatar avatar={avatarUrl || null} name={username} size={96} />
        <button
          type="button"
          aria-label="Cambiar avatar"
          onClick={onPickAvatar}
          disabled={busy}
          className="absolute -bottom-1 -right-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#8b6b2e] bg-[#120806] text-brand-gold-light shadow-[0_0_0_3px_#0a0a0a] transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-60"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-w-0">
        <h1 className="truncate font-display text-[2.125rem] font-bold leading-[1.05] tracking-[-0.02em] text-text-premium lg:text-[2.5rem]">
          {username || 'Jugador'}
        </h1>
        {phone && <p className="mt-1 font-mono text-base tabular-nums text-[#bdb7a6]">{phone}</p>}
      </div>
    </div>
  );
}

/* ── Resumen de juego ───────────────────────────────────────── */

export function ProfileStats({ stats }: { readonly stats: PlayerStats | null }) {
  return (
    <Section
      id="perfil-juego"
      title="Tu juego"
      aside={
        <Link href="/stats" className={playerTextLink}>
          Estadísticas
        </Link>
      }
    >
      <dl className="mt-4 grid grid-cols-3 divide-x divide-[#8b6b2e]/35">
        <StatCell label="Mesas" value={stats?.games_played || 0} />
        <StatCell label="Victorias" value={stats?.games_won || 0} />
        <StatCell label="Primeras" value={stats?.primeras_count || 0} />
      </dl>
    </Section>
  );
}

function StatCell({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="px-3 py-1 text-center first:pl-0 last:pr-0">
      <dt className="text-base text-[#bdb7a6]">{label}</dt>
      <dd className="mt-1 font-mono text-[1.75rem] font-medium leading-none tabular-nums text-text-premium">{value}</dd>
    </div>
  );
}

/* ── Seguridad ──────────────────────────────────────────────── */

interface LockToggleProps {
  readonly enabled: boolean;
  readonly onToggle: () => void;
}

/** Interruptor del bloqueo biométrico (`role="switch"`). */
export function LockToggle({ enabled, onToggle }: LockToggleProps) {
  return (
    <div className="flex min-h-[4.5rem] items-center gap-4 py-3">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#8b6b2e]/70 bg-[#0a2c20] text-brand-gold-light">
        <Fingerprint className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold text-text-premium" id="lock-label">
          Bloqueo con huella o rostro
        </span>
        <span className="block text-base text-[#bdb7a6]">Pide tu huella o tu rostro al abrir la app.</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Activar bloqueo biométrico"
        onClick={onToggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
          enabled ? 'bg-brand-gold' : 'bg-[#35180f] shadow-[inset_0_0_0_1px_rgba(139,107,46,0.8)]'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full shadow-md transition-transform duration-200 ${
            enabled ? 'translate-x-6 bg-[#0a0a0a]' : 'translate-x-0 bg-[#d9d3bf]'
          }`}
        />
      </button>
    </div>
  );
}

/* ── Ayuda ──────────────────────────────────────────────────── */

function HelpRow({ icon: Icon, label, href, onClick }: { readonly icon: typeof BookOpen; readonly label: ReactNode; readonly href?: string; readonly onClick?: () => void }) {
  const className =
    '-mx-2 flex min-h-16 w-[calc(100%+1rem)] items-center gap-4 rounded-lg px-2 text-left text-lg font-semibold text-text-premium transition-colors hover:bg-[#1b0d08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light';
  const body = (
    <>
      <Icon className="h-6 w-6 shrink-0 text-[#c5a059]" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#c5a059]" aria-hidden="true" />
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function ProfileHelp() {
  return (
    <Section id="perfil-ayuda" title="Ayuda">
      <ul className="mt-1 divide-y divide-[#8b6b2e]/30">
        <li>
          <HelpRow icon={MessageCircle} label="Hablar con soporte" onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))} />
        </li>
        <li>
          <HelpRow icon={BookOpen} label="Reglas del juego" href="/rules" />
        </li>
        <li>
          <HelpRow icon={FileText} label="Términos y privacidad" href="/terms" />
        </li>
      </ul>
    </Section>
  );
}
