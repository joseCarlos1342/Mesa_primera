'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * Displays a banner when the dashboard has degraded data sources.
 * Each warning indicates a specific data source that failed.
 */
export function DashboardWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest text-amber-400">
          {warnings.length} fuente{warnings.length > 1 ? 's' : ''} degradada{warnings.length > 1 ? 's' : ''}
        </span>
      </div>
      <ul className="space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="text-[11px] text-amber-300/80 font-mono pl-6">
            • {w}
          </li>
        ))}
      </ul>
    </div>
  );
}
