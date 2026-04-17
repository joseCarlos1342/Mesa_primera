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
  gradient: string;
  accentColor: string;
  label: string;
}> = {
  system_announcement: {
    icon: Megaphone,
    gradient: 'linear-gradient(135deg, rgba(212,175,55,0.95) 0%, rgba(184,134,11,0.95) 100%)',
    accentColor: '#0a180e',
    label: 'ANUNCIO',
  },
  maintenance: {
    icon: AlertTriangle,
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.95) 0%, rgba(217,119,6,0.95) 100%)',
    accentColor: '#0a180e',
    label: 'MANTENIMIENTO',
  },
  promo: {
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)',
    accentColor: '#0a180e',
    label: 'PROMOCIÓN',
  },
  security: {
    icon: ShieldAlert,
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.95) 0%, rgba(185,28,28,0.95) 100%)',
    accentColor: '#fff',
    label: 'SEGURIDAD',
  },
};

const AUTO_DISMISS_MS = 15_000;

export function BroadcastBanner({ userId }: { userId: string }) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const bannerRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
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
    gsap.set(el, { yPercent: -100, opacity: 0 });
    gsap.to(el, {
      yPercent: 0,
      opacity: 1,
      duration: 0.6,
      ease: 'power3.out',
    });

    // Shimmer sweep
    if (shimmerRef.current) {
      gsap.fromTo(
        shimmerRef.current,
        { xPercent: -100 },
        { xPercent: 200, duration: 1.5, ease: 'power2.inOut', delay: 0.4 }
      );
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
      className="fixed top-0 left-0 right-0 z-200 pointer-events-auto"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className="relative overflow-hidden backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
        style={{ background: config.gradient }}
      >
        {/* Shimmer sweep */}
        <div
          ref={shimmerRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            width: '40%',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
            style={{
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            <Icon className="w-5 h-5" style={{ color: config.accentColor }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-black uppercase tracking-[0.3em] px-2 py-0.5 rounded-md"
                style={{
                  color: config.accentColor,
                  background: 'rgba(0,0,0,0.12)',
                }}
              >
                {config.label}
              </span>
            </div>
            <h4
              className="text-sm sm:text-base font-black uppercase italic leading-tight truncate"
              style={{ color: config.accentColor }}
            >
              {visible.title}
            </h4>
            <p
              className="text-xs sm:text-sm leading-relaxed mt-1 line-clamp-2 opacity-80"
              style={{ color: config.accentColor }}
            >
              {visible.body}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => handleDismiss(visible.broadcastId)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 mt-0.5"
            style={{
              background: 'rgba(0,0,0,0.15)',
              color: config.accentColor,
            }}
            aria-label="Cerrar anuncio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar (auto-dismiss timer) */}
        <div className="h-0.5 w-full" style={{ background: 'rgba(0,0,0,0.1)' }}>
          <div
            className="h-full"
            style={{
              background: config.accentColor,
              opacity: 0.3,
              animation: `shrink-bar ${AUTO_DISMISS_MS}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
