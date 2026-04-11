'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Invisible component that subscribes to ledger INSERT events via
 * Supabase Realtime and triggers a debounced server-component refresh.
 * Follows the same pattern as admin/alerts/page.tsx.
 */
export function LedgerRealtimeRefresh() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-ledger-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ledger' },
        () => {
          // Debounce: batch rapid inserts (e.g. win+rake in same award_pot)
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            router.refresh();
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
