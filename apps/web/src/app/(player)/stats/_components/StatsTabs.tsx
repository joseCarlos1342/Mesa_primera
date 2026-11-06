"use client";

interface StatsTabsProps {
  activeTab: 'personal' | 'global';
  onChange: (tab: 'personal' | 'global') => void;
}

const TABS = [
  { id: 'personal', label: 'Mis números' },
  { id: 'global', label: 'Ranking' },
] as const

/** Control segmentado de 48px entre las estadísticas propias y el ranking. */
export function StatsTabs({ activeTab, onChange }: StatsTabsProps) {
  return (
    <div role="tablist" aria-label="Vista de estadísticas" className="mb-8 grid max-w-md grid-cols-2 gap-1 rounded-xl border border-[#8b6b2e]/60 bg-[#120806] p-1">
      {TABS.map(({ id, label }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`stats-tab-${id}`}
            aria-selected={active}
            aria-controls="stats-panel"
            onClick={() => onChange(id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault()
                const next = id === 'personal' ? 'global' : 'personal'
                onChange(next)
                document.getElementById(`stats-tab-${next}`)?.focus()
              }
            }}
            className={`min-h-12 rounded-lg text-lg font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
              active ? 'bg-[#0a2c20] text-brand-gold-light shadow-[inset_0_0_0_1px_rgba(197,160,89,0.6)]' : 'text-[#d9d3bf] hover:text-text-premium'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  );
}
