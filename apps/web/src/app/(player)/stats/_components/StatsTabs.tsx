"use client";

import { m } from "framer-motion";

interface StatsTabsProps {
  activeTab: 'personal' | 'global';
  onChange: (tab: 'personal' | 'global') => void;
}

export function StatsTabs({ activeTab, onChange }: StatsTabsProps) {
  return (
    <div className="flex p-1 bg-black/40 backdrop-blur-xl border-2 border-white/5 rounded-2xl w-full max-w-sm mx-auto shadow-2xl">
      <button
        onClick={() => onChange('personal')}
        className={`relative flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden rounded-xl ${
          activeTab === 'personal' ? 'text-black' : 'text-text-secondary hover:text-text-premium'
        }`}
      >
        {activeTab === 'personal' && (
          <m.div
            layoutId="activeTabStats"
            className="absolute inset-0 bg-brand-gold shadow-[0_0_20px_rgba(202,171,114,0.4)]"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">Mis Stats</span>
      </button>
      
      <button
        onClick={() => onChange('global')}
        className={`relative flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden rounded-xl ${
          activeTab === 'global' ? 'text-black' : 'text-text-secondary hover:text-text-premium'
        }`}
      >
        {activeTab === 'global' && (
          <m.div
            layoutId="activeTabStats"
            className="absolute inset-0 bg-brand-gold shadow-[0_0_20px_rgba(202,171,114,0.4)]"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">Ranking Global</span>
      </button>
    </div>
  );
}
