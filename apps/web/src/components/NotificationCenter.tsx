'use client';
import { useState, useEffect } from 'react';
import { Bell, CheckCheck, ChevronRight, Info, MessageCircle, UserPlus, Gamepad2, Trash2, Wallet } from 'lucide-react';
import { PlayerSheet } from '@/components/player/PlayerSheet';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { deleteNotification } from '@/app/actions/social-actions';

interface NotificationCenterProps {
  userId: string;
}

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
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
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const typedNotifications = data as AppNotification[];
        setNotifications(typedNotifications);
        setUnreadCount(typedNotifications.filter((notification) => !notification.read_at).length);
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
        (payload: { new: AppNotification }) => {
          const newNotif = payload.new as AppNotification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play sound
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch { /* audio play not critical */ }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const markAllRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDeleting(id);
    const res = await deleteNotification(id);
    if (res.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => notifications.find(n => n.id === id && !n.read_at) ? Math.max(0, prev - 1) : prev);
    }
    setIsDeleting(null);
  };

  const handleNavigate = async (n: AppNotification) => {
    // Always delete after clicking "Ir" as requested by user
    const res = await deleteNotification(n.id);
    if (res.success) {
      setNotifications(prev => prev.filter(item => item.id !== n.id));
      if (!n.read_at) {
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
      case 'direct_message': {
        const friendId = n.data?.senderId || n.data?.chatWith;
        router.push(friendId ? `/friends?chat=${friendId}` : '/friends');
        break;
      }
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
      return format(new Date(dateStr), 'dd/MM HH:mm');
    } catch {
      return '';
    }
  };

  const hasDestination = (type: string) => NAVIGABLE_TYPES.has(type);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        aria-haspopup="dialog"
        className={`relative inline-flex h-12 w-12 items-center justify-center rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
          unreadCount > 0
            ? 'border-brand-gold bg-[#0a2c20] text-brand-gold-light'
            : 'border-[#8b6b2e]/60 text-[#d9d3bf] hover:border-brand-gold hover:text-brand-gold-light'
        }`}
      >
        <Bell className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-gold px-1 font-mono text-sm font-semibold tabular-nums text-[#0a0a0a] shadow-[0_0_0_2px_#0a0a0a]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <PlayerSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notificaciones"
        description={
          unreadCount > 0 ? `${unreadCount} sin leer` : notifications.length > 0 ? 'Todas leídas.' : 'Estás al día.'
        }
        closeLabel="Cerrar notificaciones"
        footer={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#8b6b2e]/80 text-lg font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              <CheckCheck className="h-5 w-5" aria-hidden="true" />
              Marcar todas como leídas
            </button>
          ) : undefined
        }
      >
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span aria-hidden="true" className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#8b6b2e]/60 bg-[#0a0a0a] text-brand-gold-light">
              <Bell className="h-6 w-6" />
            </span>
            <p className="font-display text-[1.375rem] font-bold text-text-premium">No tienes notificaciones</p>
            <p className="mt-2 max-w-[32ch] text-base text-[#bdb7a6]">Aquí verás invitaciones, solicitudes de amistad y movimientos de saldo.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
            {notifications.map((n) => {
              const Icon = notificationIcon(n.type);
              const unread = !n.read_at;
              return (
                <li key={n.id} className="flex gap-3 py-4">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
                      unread ? 'border-brand-gold/70 bg-[#0a2c20] text-brand-gold-light' : 'border-[#8b6b2e]/40 bg-[#0a0a0a] text-[#bdb7a6]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-lg font-semibold leading-snug ${unread ? 'text-text-premium' : 'text-[#d9d3bf]'}`}>
                        {unread && <span className="sr-only">Sin leer: </span>}
                        {n.title}
                      </h3>
                      <time className="shrink-0 pt-0.5 font-mono text-sm tabular-nums text-[#bdb7a6]" dateTime={n.created_at}>
                        {formatNotifDate(n.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 text-base leading-relaxed text-[#d9d3bf] [overflow-wrap:anywhere]">{formatNotificationBody(n.body)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {hasDestination(n.type) && (
                        <button
                          type="button"
                          onClick={() => handleNavigate(n)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#8b6b2e]/80 px-4 text-base font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                        >
                          Abrir
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, n.id)}
                        disabled={isDeleting === n.id}
                        aria-label={`Borrar notificación: ${n.title}`}
                        className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#f08a7e] transition-colors hover:bg-[#2a0f0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-50"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PlayerSheet>
    </>
  );
}

const NAVIGABLE_TYPES = new Set([
  'game_invite',
  'friend_request',
  'friend_accepted',
  'friend_removed',
  'direct_message',
  'deposit_success',
  'withdraw_success',
  'wallet_update',
]);

function notificationIcon(type: string) {
  if (type?.startsWith('friend')) return UserPlus;
  if (type === 'game_invite') return Gamepad2;
  if (type === 'direct_message') return MessageCircle;
  if (type?.startsWith('deposit') || type?.startsWith('withdraw') || type === 'wallet_update') return Wallet;
  return Info;
}
