"use client";

import { useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Trophy, Target, Flame, Star, Gift, Check, Loader2, Lock, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";
import { claimBonus, type BonusStatus, type BonusTier } from "@/app/actions/bonus";

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

export function StatsDashboard({
  stats,
  bonusStatus: initialBonusStatus,
}: {
  stats: PlayerStats;
  bonusStatus: BonusStatus | null;
}) {
  const [bonusStatus, setBonusStatus] = useState(initialBonusStatus);
  const winRate =
    stats.games_played > 0
      ? Math.round((stats.games_won / stats.games_played) * 100)
      : 0;

  const totalSpecialPlays =
    stats.primeras_count + stats.chivos_count + stats.segundas_count;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      {/* Main KPI Grid — 4 cards */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <StatHero
          title="Partidas"
          value={stats.games_played}
          icon={Target}
          color="from-blue-500/20 to-blue-600/5"
          borderColor="border-blue-500/30"
          iconColor="text-blue-400"
        />
        <StatHero
          title="Win Rate"
          value={`${winRate}%`}
          sub={`${stats.games_won} victorias`}
          icon={Trophy}
          color="from-emerald-500/20 to-emerald-600/5"
          borderColor="border-emerald-500/30"
          iconColor="text-emerald-400"
        />
        <StatHero
          title="Racha Actual"
          value={stats.current_streak}
          sub={`Mejor: ${stats.best_streak}`}
          icon={Flame}
          color="from-orange-500/20 to-orange-600/5"
          borderColor="border-orange-500/30"
          iconColor="text-orange-400"
        />
        <StatHero
          title="Jugadas Especiales"
          value={totalSpecialPlays}
          sub={`${stats.primeras_count}P · ${stats.chivos_count}C · ${stats.segundas_count}S`}
          icon={Star}
          color="from-brand-gold/20 to-brand-gold/5"
          borderColor="border-brand-gold/30"
          iconColor="text-brand-gold"
        />
      </div>

      {/* Cantos Especiales */}
      <section className="bg-black/40 backdrop-blur-xl border-2 border-white/5 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute inset-0 bg-felt-texture opacity-10 pointer-events-none" />

        <div className="relative z-10 space-y-6 md:space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20">
              <Star className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-text-premium uppercase tracking-tight italic">
                Cantos Especiales
              </h2>
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                Tu desempeño técnico en mesa
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <SpecialStat label="Primeras" count={stats.primeras_count} color="text-brand-gold" bgColor="bg-brand-gold/10" description="La racha perfecta" />
            <SpecialStat label="Chivos" count={stats.chivos_count} color="text-orange-400" bgColor="bg-orange-400/10" description="Doblada de apuesta" />
            <SpecialStat label="Segundas" count={stats.segundas_count} color="text-brand-red" bgColor="bg-brand-red/10" description="Asegurando el punto" />
          </div>
        </div>
      </section>

      {/* Bono del Mes */}
      {bonusStatus && (
        <BonusCard bonusStatus={bonusStatus} onUpdate={setBonusStatus} />
      )}
    </div>
  );
}

/* ─────────── Bonus Card ─────────── */

function BonusCard({
  bonusStatus,
  onUpdate,
}: {
  bonusStatus: BonusStatus;
  onUpdate: (bs: BonusStatus) => void;
}) {
  const [claiming, setClaiming] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<{ name: string; amount: number } | null>(null);

  const nextTier = bonusStatus.tiers.find((t) => !t.unlocked);
  const currentRake = bonusStatus.monthly_rake_cents;
  const progressTarget = nextTier?.min_rake_cents ?? currentRake;
  const progressPct =
    progressTarget > 0
      ? Math.min(100, Math.round((currentRake / progressTarget) * 100))
      : 100;

  const hasClaimable = bonusStatus.tiers.some((t) => t.unlocked && !t.claimed);

  const fireConfetti = useCallback(() => {
    const duration = 2500;
    const end = Date.now() + duration;

    const gold = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };

    // Initial burst from center
    confetti({ ...gold, particleCount: 80, origin: { x: 0.5, y: 0.4 }, colors: ["#cab172", "#f5d998", "#10b981", "#34d399", "#ffffff"] });

    // Staggered side bursts
    setTimeout(() => {
      confetti({ ...gold, particleCount: 50, origin: { x: 0.2, y: 0.6 }, colors: ["#cab172", "#f5d998", "#10b981"] });
      confetti({ ...gold, particleCount: 50, origin: { x: 0.8, y: 0.6 }, colors: ["#cab172", "#f5d998", "#10b981"] });
    }, 300);

    // Slow rain effect
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return; }
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#cab172", "#10b981", "#f5d998"],
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#cab172", "#10b981", "#f5d998"],
        zIndex: 9999,
      });
    }, 120);
  }, []);

  const handleClaim = async (tierId: number) => {
    setClaiming(tierId);
    const result = await claimBonus(tierId);
    if (result.success) {
      const claimed = bonusStatus.tiers.find((t) => t.id === tierId);
      onUpdate({
        ...bonusStatus,
        tiers: bonusStatus.tiers.map((t) =>
          t.id === tierId ? { ...t, claimed: true } : t
        ),
      });
      // Fire celebration
      if (claimed) {
        setCelebration({ name: claimed.name, amount: claimed.bonus_amount_cents });
        fireConfetti();
        setTimeout(() => setCelebration(null), 4000);
      }
    }
    setClaiming(null);
  };

  const formatCOP = (cents: number) =>
    `$${(cents / 100).toLocaleString("es-CO")}`;

  return (
    <section className="bg-linear-to-br from-emerald-600/15 via-black/40 to-black/60 backdrop-blur-xl border-2 border-emerald-500/20 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <Gift className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-text-premium uppercase tracking-tight italic">
                Bono del Mes
              </h2>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                {bonusStatus.period}
              </p>
            </div>
          </div>
          {hasClaimable && (
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-[10px] font-black text-emerald-300 uppercase tracking-widest animate-pulse">
              Disponible
            </span>
          )}
        </div>

        {/* Progress bar */}
        {nextTier && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-300/70 px-1">
              {progressPct < 30
                ? "¡Cada mesa te acerca a tu bono! 🎯"
                : progressPct < 70
                  ? "¡Vas por buen camino, sigue jugando! 🔥"
                  : "¡Ya casi lo tienes, una mesa más! 💰"}
            </p>
            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-shimmer" />
              </m.div>
            </div>
          </div>
        )}

        {/* Tiers */}
        <div className="space-y-3">
          {bonusStatus.tiers.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              claiming={claiming === tier.id}
              onClaim={() => handleClaim(tier.id)}
              formatCOP={formatCOP}
            />
          ))}
        </div>
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {celebration && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-[2.5rem]"
          >
            <m.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="text-center space-y-4"
            >
              <m.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0], y: [0, -8, 0] }}
                transition={{ duration: 1, repeat: 1 }}
                className="mx-auto w-20 h-20 bg-brand-gold/20 rounded-3xl flex items-center justify-center border-2 border-brand-gold/40 shadow-[0_0_40px_rgba(202,171,114,0.3)]"
              >
                <PartyPopper className="w-10 h-10 text-brand-gold" />
              </m.div>
              <m.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl font-display font-black text-brand-gold italic uppercase tracking-tight"
              >
                ¡Bono {celebration.name}!
              </m.p>
              <m.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-4xl md:text-5xl font-display font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                +{formatCOP(celebration.amount)}
              </m.p>
              <m.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.4em]"
              >
                Acreditado a tu bóveda
              </m.p>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TierRow({
  tier,
  claiming,
  onClaim,
  formatCOP,
}: {
  tier: BonusTier;
  claiming: boolean;
  onClaim: () => void;
  formatCOP: (n: number) => string;
}) {
  const canClaim = tier.unlocked && !tier.claimed;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
        tier.claimed
          ? "bg-emerald-500/10 border-emerald-500/20"
          : tier.unlocked
            ? "bg-brand-gold/10 border-brand-gold/30 shadow-lg"
            : "bg-white/5 border-white/5 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            tier.claimed
              ? "bg-emerald-500/20"
              : tier.unlocked
                ? "bg-brand-gold/20"
                : "bg-white/10"
          }`}
        >
          {tier.claimed ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : tier.unlocked ? (
            <Gift className="w-4 h-4 text-brand-gold" />
          ) : (
            <Lock className="w-4 h-4 text-white/30" />
          )}
        </div>
        <div>
          <p
            className={`text-sm font-display font-black uppercase tracking-tight ${
              tier.claimed
                ? "text-emerald-300"
                : tier.unlocked
                  ? "text-brand-gold"
                  : "text-white/40"
            }`}
          >
            {tier.name}
          </p>
          <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
            {tier.claimed
              ? "Reclamado"
              : `Bono: ${formatCOP(tier.bonus_amount_cents)}`}
          </p>
        </div>
      </div>

      {canClaim && (
        <button
          type="button"
          onClick={onClaim}
          disabled={claiming}
          className="px-4 py-2 bg-brand-gold text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-lg"
        >
          {claiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Reclamar"
          )}
        </button>
      )}
    </div>
  );
}

/* ─────────── Shared Sub-components ─────────── */

function StatHero({
  title,
  value,
  sub,
  icon: Icon,
  color,
  borderColor,
  iconColor,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: typeof Target;
  color: string;
  borderColor: string;
  iconColor: string;
}) {
  return (
    <m.div
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden bg-linear-to-br ${color} backdrop-blur-xl border-2 ${borderColor} p-5 md:p-6 h-36 md:h-40 rounded-4xl md:rounded-[2.5rem] flex flex-col justify-center gap-1 group transition-all duration-500 shadow-xl`}
    >
      <div className="absolute top-3 right-4 md:top-4 md:right-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
        <Icon className={`w-12 h-12 md:w-16 md:h-16 ${iconColor}`} />
      </div>

      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">
        {title}
      </p>
      <div className="flex flex-col">
        <p className="text-3xl md:text-4xl font-display font-black text-white italic tracking-tighter drop-shadow-lg">
          {value}
        </p>
        {sub && (
          <span className="text-[9px] md:text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            {sub}
          </span>
        )}
      </div>
    </m.div>
  );
}

function SpecialStat({
  label,
  count,
  color,
  bgColor,
  description,
}: {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  description: string;
}) {
  return (
    <div
      className={`p-4 md:p-6 ${bgColor} rounded-3xl md:rounded-4xl border border-white/5 flex flex-col items-center text-center gap-1 md:gap-2 group hover:border-brand-gold/20 transition-all active:scale-95`}
    >
      <span
        className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] ${color}`}
      >
        {label}
      </span>
      <span className="text-2xl md:text-3xl font-display font-black text-white italic">
        {count}
      </span>
      <p className="text-[8px] md:text-[10px] font-bold text-text-secondary uppercase tracking-widest">
        {description}
      </p>
    </div>
  );
}
