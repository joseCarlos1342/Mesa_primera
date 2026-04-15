'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const REFRESH_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Client component that triggers periodic server-component refresh
 * for the admin dashboard. Shows time since last fetch.
 */
export function DashboardAutoRefresh({ fetchedAt }: { fetchedAt: string }) {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Update "seconds ago" counter every second
    const tick = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 1000);
      setSecondsAgo(diff);
    }, 1000);

    // Auto-refresh the page at a fixed interval
    intervalRef.current = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(tick);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchedAt, router]);

  const label = secondsAgo < 5
    ? 'ACTUALIZADO'
    : `HACE ${secondsAgo}s`;

  return (
    <span
      className="text-[10px] font-bold tracking-tighter"
      title={`Última carga: ${new Date(fetchedAt).toLocaleTimeString('es-ES')}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${secondsAgo < 35 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
      <span className={secondsAgo < 35 ? 'text-emerald-500' : 'text-amber-500'}>
        {label}
      </span>
    </span>
  );
}
