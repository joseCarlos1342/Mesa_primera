"use client";

import { useState, useCallback } from "react";
import { Check, Gift, Lock } from "lucide-react";
import confetti from "canvas-confetti";
import { claimBonus, type BonusStatus, type BonusTier } from "@/app/actions/bonus";
import { PlayingCard } from "@/components/landing/PlayingCard";
import { TEACHING_HANDS, cardId, type HandKind } from "@/components/landing/primeraHands";
import { AuthButton } from "@/components/auth/AuthForm";
import { Section } from "@/components/player/PlayerUI";

interface PlayerStats {
  games_played: number;
  games_won: number;
  current_streak: number;
  best_streak: number;
  primeras_count: number;
  chivos_count: number;
  segundas_count: number;
  total_won_cents: number;
  total_lost_cents: number;
  total_rake_paid_cents: number;
}

const formatCOP = (cents: number) => `$${(cents / 100).toLocaleString("es-CO")}`;

export function StatsDashboard({
  stats,
  bonusStatus: initialBonusStatus,
}: {
  stats: PlayerStats;
  bonusStatus: BonusStatus | null;
}) {
  const [bonusStatus, setBonusStatus] = useState(initialBonusStatus);
  const winRate = stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
  const totalSpecialPlays = stats.primeras_count + stats.chivos_count + stats.segundas_count;
  const handCounts: Record<Exclude<HandKind, "puntos">, number> = {
    segunda: stats.segundas_count,
    chivo: stats.chivos_count,
    primera: stats.primeras_count,
  };

  return (
    <div className="space-y-12">
      <section aria-label="Resumen">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-4">
          <Metric title="Partidas" value={stats.games_played} />
          <Metric title="Victorias" value={`${winRate}%`} sub={`${stats.games_won} victorias`} />
          <Metric title="Racha actual" value={stats.current_streak} sub={`Mejor: ${stats.best_streak}`} />
          <Metric title="Jugadas especiales" value={totalSpecialPlays} sub="Segundas, chivos y primeras" />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <Section id="stats-manos" title="Manos especiales" className="min-w-0">
          <p className="mt-3 text-base text-[#bdb7a6]">Cuántas veces las has cantado, de la más alta a la más baja.</p>
          <ul className="mt-2 divide-y divide-[#8b6b2e]/30">
            {TEACHING_HANDS.filter((hand) => hand.kind !== "puntos").map((hand) => (
              <li key={hand.kind} className="flex items-center gap-4 py-4">
                <span aria-hidden="true" className="flex shrink-0 pl-1">
                  {hand.cards.map((card, index) => (
                    <span key={cardId(card)} className="-ml-4 w-9 first:ml-0" style={{ transform: `rotate(${(index - 1.5) * 7}deg)` }}>
                      <PlayingCard card={card} sizes="36px" decorative />
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[1.375rem] font-bold leading-tight text-text-premium">{hand.title}</span>
                  <span className="block text-base leading-snug text-[#bdb7a6]">{hand.rule}</span>
                </span>
                <span className="shrink-0 font-mono text-[2rem] font-medium leading-none tabular-nums text-text-premium">
                  {handCounts[hand.kind as Exclude<HandKind, "puntos">]}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {bonusStatus && <BonusCard bonusStatus={bonusStatus} onUpdate={setBonusStatus} />}
      </div>
    </div>
  );
}

function Metric({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="border-l border-[#8b6b2e]/50 pl-4">
      <dt className="text-base text-[#bdb7a6]">{title}</dt>
      <dd className="mt-1.5 font-mono text-[2.25rem] font-medium leading-none tabular-nums text-text-premium">{value}</dd>
      {sub && <dd className="mt-1.5 text-base text-[#d9d3bf]">{sub}</dd>}
    </div>
  );
}

/* ─────────── Bono del mes ─────────── */

function formatPeriod(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(date);
}

function progressMessage(pct: number) {
  if (pct < 30) return "Cada mesa te acerca a tu bono.";
  if (pct < 70) return "Vas por buen camino, sigue jugando.";
  return "Ya casi lo tienes.";
}

function BonusCard({ bonusStatus, onUpdate }: { bonusStatus: BonusStatus; onUpdate: (bs: BonusStatus) => void }) {
  const [claiming, setClaiming] = useState<number | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ name: string; amount: number } | null>(null);

  const nextTier = bonusStatus.tiers.find((t) => !t.unlocked);
  const currentRake = bonusStatus.monthly_rake_cents;
  const progressTarget = nextTier?.min_rake_cents ?? currentRake;
  const progressPct = progressTarget > 0 ? Math.min(100, Math.round((currentRake / progressTarget) * 100)) : 100;
  const hasClaimable = bonusStatus.tiers.some((t) => t.unlocked && !t.claimed);

  const fireConfetti = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#e2b044", "#f0d78c", "#45996c", "#f3edd7"];
    confetti({ particleCount: 90, spread: 80, startVelocity: 32, ticks: 90, origin: { x: 0.5, y: 0.45 }, colors, zIndex: 9999 });
  }, []);

  const handleClaim = async (tierId: number) => {
    setClaiming(tierId);
    setClaimError(null);
    try {
      const result = await claimBonus(tierId);
      if (result.error) {
        setClaimError(result.error);
        return;
      }

      if (result.success) {
        const claimed = bonusStatus.tiers.find((t) => t.id === tierId);
        onUpdate({
          ...bonusStatus,
          tiers: bonusStatus.tiers.map((t) => (t.id === tierId ? { ...t, claimed: true } : t)),
        });
        if (claimed) {
          setCelebration({ name: claimed.name, amount: claimed.bonus_amount_cents });
          fireConfetti();
          setTimeout(() => setCelebration(null), 4000);
        }
      }
    } finally {
      setClaiming(null);
    }
  };

  return (
    <Section
      id="stats-bono"
      title="Bono del mes"
      className="min-w-0"
      aside={
        hasClaimable ? (
          <span className="rounded-full border border-brand-gold/70 px-2.5 py-0.5 text-sm font-semibold text-brand-gold-light">Disponible</span>
        ) : undefined
      }
    >
      <p className="mt-3 text-base text-[#bdb7a6] first-letter:uppercase">{formatPeriod(bonusStatus.period)}</p>

      {nextTier && (
        <div className="mt-4">
          <p className="text-lg text-[#d9d3bf]">{progressMessage(progressPct)}</p>
          <div
            role="progressbar"
            aria-label={`Progreso hacia el bono ${nextTier.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#35180f]"
          >
            <div
              className="h-full rounded-full bg-[#45996c] transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {celebration && (
        <div role="status" className="mt-5 rounded-lg border border-[#2ecc71]/45 bg-[#0a2c20] px-4 py-3.5">
          <p className="font-display text-[1.375rem] font-bold text-text-premium">¡Bono {celebration.name}!</p>
          <p className="mt-0.5 text-lg text-[#d9d3bf]">
            <span className="font-mono font-semibold text-[#5fd38d]">+{formatCOP(celebration.amount)}</span> acreditado a tu saldo.
          </p>
        </div>
      )}

      <ul className="mt-4 divide-y divide-[#8b6b2e]/30">
        {bonusStatus.tiers.map((tier) => (
          <TierRow key={tier.id} tier={tier} claiming={claiming === tier.id} onClaim={() => handleClaim(tier.id)} />
        ))}
      </ul>

      {claimError && (
        <p role="alert" className="mt-4 rounded-lg border border-[#e74c3c]/70 bg-[#2a0f0c] px-4 py-3 text-base text-[#f6d5d0]">
          {claimError}
        </p>
      )}
    </Section>
  );
}

function TierRow({ tier, claiming, onClaim }: { tier: BonusTier; claiming: boolean; onClaim: () => void }) {
  const canClaim = tier.unlocked && !tier.claimed;
  const Icon = tier.claimed ? Check : tier.unlocked ? Gift : Lock;

  return (
    <li className="flex min-h-[4.5rem] items-center gap-4 py-3">
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
          tier.claimed
            ? "border-[#2ecc71]/40 bg-[#0a2c20] text-[#5fd38d]"
            : tier.unlocked
              ? "border-brand-gold/70 bg-[#0a2c20] text-brand-gold-light"
              : "border-[#8b6b2e]/40 bg-[#120806] text-[#bdb7a6]"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold text-text-premium">{tier.name}</span>
        <span className="block text-base text-[#bdb7a6]">
          {tier.claimed ? "Reclamado" : tier.unlocked ? `Bono: ${formatCOP(tier.bonus_amount_cents)}` : `Bono: ${formatCOP(tier.bonus_amount_cents)} · Bloqueado`}
        </span>
      </span>
      {canClaim && (
        <AuthButton onClick={onClaim} pending={claiming} className="min-h-12! w-auto! shrink-0 px-5 text-base!">
          Reclamar
        </AuthButton>
      )}
    </li>
  );
}
