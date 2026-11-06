'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { X, Megaphone, AlertTriangle, Sparkles, ShieldAlert } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { SocketBroadcastEvent, BroadcastType } from '@/lib/broadcast';

interface BannerData {
  broadcastId: string;
  type: BroadcastType;
  title: string;
  body: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<BroadcastType, {
  icon: typeof Megaphone;
  border: string;
  iconClass: string;
  label: string;
}> = {
  system_announcement: { icon: Megaphone, border: 'border-[#c5a059]', iconClass: 'text-brand-gold-light', label: 'Anuncio' },
  maintenance: { icon: AlertTriangle, border: 'border-[#e2b044]', iconClass: 'text-brand-gold', label: 'Mantenimiento' },
  promo: { icon: Sparkles, border: 'border-[#45996c]', iconClass: 'text-[#7fe0a6]', label: 'Promoción' },
  security: { icon: ShieldAlert, border: 'border-[#e74c3c]', iconClass: 'text-[#f08a7e]', label: 'Seguridad' },
};

const AUTO_DISMISS_MS = 15_000;

export function BroadcastBanner({ userId }: { userId: string }) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const bannerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Inject keyframes once
  useEffect(() => {
    const id = 'broadcast-banner-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes shrink-bar { from { width: 100%; } to { width: 0%; } }`;
    document.head.appendChild(style);
  }, []);

  // Load session-dismissed IDs from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('dismissed-broadcasts');
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch { /* no-op */ }
  }, []);

  const persistDismissed = useCallback((ids: Set<string>) => {
    try {
      sessionStorage.setItem('dismissed-broadcasts', JSON.stringify([...ids]));
    } catch { /* no-op */ }
  }, []);

  // Fetch active broadcasts on mount (persistence: survive page refresh)
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const fetchRecent = async () => {
      const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data } = await supabase
        .from('notifications')
        .select('broadcast_id, type, title, body, created_at')
        .eq('user_id', userId)
        .not('broadcast_id', 'is', null)
        .gte('created_at', tenMinAgo)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data && data.length > 0) {
        const mapped: BannerData[] = data.map((n: any) => ({
          broadcastId: n.broadcast_id,
          type: n.type as BroadcastType,
          title: n.title,
          body: n.body,
          createdAt: n.created_at,
        }));
        setBanners(prev => {
          const existing = new Set(prev.map(b => b.broadcastId));
          const newOnes = mapped.filter(m => !existing.has(m.broadcastId));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      }
    };

    fetchRecent();
  }, [userId]);

  // Listen for Socket.IO broadcast events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SocketBroadcastEvent>).detail;
      if (!detail?.broadcastId) return;

      const banner: BannerData = {
        broadcastId: detail.broadcastId,
        type: detail.type,
        title: detail.title,
        body: detail.body,
        createdAt: detail.createdAt,
      };

      setBanners(prev => {
        if (prev.some(b => b.broadcastId === banner.broadcastId)) return prev;
        return [banner, ...prev];
      });
    };

    window.addEventListener('socket-notification', handler);
    return () => window.removeEventListener('socket-notification', handler);
  }, []);

  // Get visible banner (first non-dismissed)
  const visible = banners.find(b => !dismissed.has(b.broadcastId));

  // GSAP entrance animation
  useEffect(() => {
    if (!visible || !bannerRef.current) return;

    const el = bannerRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      gsap.set(el, { yPercent: -100, opacity: 0 });
      gsap.to(el, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    }


    // Auto-dismiss
    timeoutRef.current = setTimeout(() => {
      handleDismiss(visible.broadcastId);
    }, AUTO_DISMISS_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible?.broadcastId]);

  const handleDismiss = useCallback((id: string) => {
    if (!bannerRef.current) {
      setDismissed(prev => {
        const next = new Set(prev).add(id);
        persistDismissed(next);
        return next;
      });
      return;
    }

    gsap.to(bannerRef.current, {
      yPercent: -100,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        setDismissed(prev => {
          const next = new Set(prev).add(id);
          persistDismissed(next);
          return next;
        });
      },
    });
  }, [persistDismissed]);

  if (!visible) return null;

  const config = TYPE_CONFIG[visible.type] || TYPE_CONFIG.system_announcement;
  const Icon = config.icon;

  return (
    <div
      ref={bannerRef}
      role="alert"
      aria-live="polite"
      className="pointer-events-auto fixed inset-x-0 top-0 z-200 px-3 lg:pl-[calc(7rem+0.75rem)]"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className={`relative mx-auto max-w-2xl overflow-hidden rounded-lg border bg-[#120806] shadow-[0_16px_36px_-12px_rgba(0,0,0,0.9)] ${config.border}`}>
        <div className="flex items-start gap-3 px-4 py-3.5">
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${config.iconClass}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${config.iconClass}`}>{config.label}</p>
            <h4 className="text-lg font-semibold leading-snug text-text-premium">{visible.title}</h4>
            <p className="mt-0.5 line-clamp-3 text-base leading-relaxed text-[#d9d3bf]">{visible.body}</p>
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(visible.broadcastId)}
            className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#d9d3bf] transition-colors hover:bg-[#35180f] hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            aria-label="Cerrar anuncio"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="h-0.5 w-full bg-[#35180f]" aria-hidden="true">
          <div
            className="h-full bg-[#8b6b2e] motion-reduce:hidden"
            style={{ animation: `shrink-bar ${AUTO_DISMISS_MS}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}
