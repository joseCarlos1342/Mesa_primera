'use client';
import { useState, useEffect } from 'react';
import { Bell, CheckCircle, Info, BellRing, UserPlus, Gamepad2, Trash2, ExternalLink } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { deleteNotification, markNotificationAsRead } from '@/app/actions/social-actions';

interface NotificationCenterProps {
  userId: string;
}

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
  data?: any;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    // 1. Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    // 2. Subscribe to new notifications
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play sound
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const markAsReadLocal = async (id: string) => {
    const res = await markNotificationAsRead(id);
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDeleting(id);
    const res = await deleteNotification(id);
    if (res.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => notifications.find(n => n.id === id && !n.is_read) ? Math.max(0, prev - 1) : prev);
    }
    setIsDeleting(null);
  };

  const handleNavigate = async (n: AppNotification) => {
    // Always delete after clicking "Ir" as requested by user
    const res = await deleteNotification(n.id);
    if (res.success) {
      setNotifications(prev => prev.filter(item => item.id !== n.id));
      if (!n.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }

    setIsOpen(false);

    // Navigation logic
    switch (n.type) {
      case 'game_invite':
        router.push('/lobby');
        break;
      case 'friend_request':
        router.push('/friends?tab=requests');
        break;
      case 'friend_accepted':
      case 'friend_removed':
        router.push('/friends');
        break;
      case 'direct_message':
        const friendId = n.data?.senderId || n.data?.chatWith;
        router.push(friendId ? `/friends?chat=${friendId}` : '/friends');
        break;
      case 'deposit_success':
      case 'withdraw_success':
      case 'wallet_update':
        router.push('/wallet');
        break;
      default:
        // Default might be profile or home
        break;
    }
  };

  const formatNotificationBody = (body: string) => {
    if (!body) return '';
    // Format amounts like $100000.000000000000 or $50000 — amounts are already in COP pesos, NOT cents
    return body.replace(/\$(\d+(?:\.\d+)?)/g, (_match, amountStr) => {
      const amount = Math.round(parseFloat(amountStr));
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    });
  };

  const formatNotifDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yy HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="relative z-[60]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 md:w-16 md:h-16 bg-black/40 rounded-2xl flex items-center justify-center border-2 border-brand-gold/20 hover:border-brand-gold/50 hover:bg-black/60 transition-all relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-90 group backdrop-blur-xl"
      >
        <Bell className={`w-6 h-6 md:w-8 md:h-8 transition-all duration-500 ${unreadCount > 0 ? 'text-brand-gold drop-shadow-[0_0_8px_rgba(202,171,114,0.6)] animate-pulse' : 'text-text-secondary group-hover:text-text-premium'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-gradient-to-br from-brand-gold-light to-brand-gold-dark text-black text-[10px] md:text-xs font-black w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full shadow-[0_4px_10px_rgba(202,171,114,0.4)] border-2 border-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed md:absolute top-24 md:top-20 inset-x-3 md:inset-auto md:right-0 w-auto md:w-[26rem] flex flex-col overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300 rounded-2xl"
          style={{
            background: 'linear-gradient(160deg, #0f2a18 0%, #091910 100%)',
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 0 0 1px rgba(212,175,55,0.06), 0 32px 72px rgba(0,0,0,0.85)',
          }}
        >
          {/* Top shimmer */}
          <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)' }}
          />

          {/* Header */}
          <div className="px-5 py-4 flex flex-wrap gap-y-2 justify-between items-center"
            style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', background: 'rgba(212,175,55,0.04)' }}
          >
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4 flex-shrink-0" style={{ color: '#d4af37' }} />
              <h3 className="text-xs font-black uppercase tracking-[0.22em] italic"
                style={{ fontFamily: "'Playfair Display', serif", color: '#fdf0a6' }}
              >
                Notificaciones
              </h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                style={{
                  color: '#d4af37',
                  border: '1px solid rgba(212,175,55,0.3)',
                  background: 'rgba(212,175,55,0.06)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,175,55,0.18)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,175,55,0.06)';
                }}
              >
                Limpiar todo
              </button>
            )}
          </div>
          
          {/* Content area */}
          <div className="max-h-[70vh] md:max-h-[30rem] overflow-y-auto custom-scrollbar p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)' }}
                >
                  <Bell className="w-8 h-8" style={{ color: 'rgba(212,175,55,0.25)' }} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(253,240,166,0.3)' }}>
                  Tu buzón está vacío
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="group relative rounded-xl transition-all duration-200"
                  style={{
                    background: !n.is_read
                      ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.05) 100%)'
                      : 'rgba(255,255,255,0.04)',
                    border: !n.is_read
                      ? '1px solid rgba(212,175,55,0.3)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="p-4">
                    {/* Top row: icon + title + timestamp */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {n.type?.startsWith('friend') ? (
                          <UserPlus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#d4af37' }} />
                        ) : n.type === 'game_invite' ? (
                          <Gamepad2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#d4af37' }} />
                        ) : n.type?.startsWith('deposit') ? (
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                        ) : (
                          <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#d4af37' }} />
                        )}
                        <h4 className="text-xs font-black uppercase italic truncate"
                          style={{ color: !n.is_read ? '#fdf0a6' : 'rgba(253,240,166,0.65)' }}
                        >
                          {n.title}
                        </h4>
                      </div>
                      {/* Timestamp — fixed width, no overflow */}
                      <time className="text-[10px] font-mono flex-shrink-0 tabular-nums"
                        style={{ color: 'rgba(212,175,55,0.5)' }}
                        dateTime={n.created_at}
                      >
                        {formatNotifDate(n.created_at)}
                      </time>
                    </div>

                    {/* Body */}
                    <p className="text-xs leading-relaxed mb-3 pl-5"
                      style={{ color: 'rgba(253,240,166,0.6)' }}
                    >
                      {formatNotificationBody(n.body)}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pl-5">
                      <button
                        onClick={() => handleNavigate(n)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.22)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.1)')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ir
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        disabled={isDeleting === n.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                        style={{ background: 'rgba(239,68,68,0.08)', color: 'rgb(248,113,113)', border: '1px solid rgba(239,68,68,0.18)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      >
                        <Trash2 className="w-3 h-3" />
                        {isDeleting === n.id ? '...' : 'Borrar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 text-center" style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }}>
            <span className="text-[9px] font-black tracking-[0.25em] uppercase" style={{ color: 'rgba(212,175,55,0.3)' }}>
              Mesa Primera · Notificaciones
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
