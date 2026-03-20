'use client';
import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, Info, BellRing, UserPlus, Clock, Gamepad2, Trash2, ExternalLink } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
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
        <div className="fixed md:absolute top-24 md:top-20 inset-x-4 md:inset-auto md:right-0 w-auto md:w-[28rem] bg-black/80 backdrop-blur-3xl border-2 border-brand-gold/30 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Header Panel */}
          <div className="p-6 border-b-2 border-brand-gold/20 flex justify-between items-center bg-brand-gold/5">
            <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-brand-gold" />
                <h3 className="text-sm font-display font-black text-brand-gold uppercase tracking-[0.2em] italic">Notificaciones</h3>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead} 
                className="text-[9px] font-black text-brand-gold hover:text-black hover:bg-brand-gold transition-all uppercase tracking-widest border-2 border-brand-gold/30 px-4 py-2 rounded-xl"
              >
                Limpiar todo
              </button>
            )}
          </div>
          
          {/* Content area */}
          <div className="max-h-[70vh] md:max-h-[32rem] overflow-y-auto custom-scrollbar p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="p-16 text-center space-y-6">
                <div className="w-20 h-20 bg-brand-gold/5 rounded-full flex items-center justify-center mx-auto border-2 border-brand-gold/10 shadow-inner">
                    <Bell className="w-10 h-10 text-brand-gold/20" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-text-secondary">Tu buzón está vacío</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`group relative p-6 rounded-[1.5rem] transition-all duration-300 border-2 ${!n.is_read ? 'bg-brand-gold/10 border-brand-gold/30 shadow-lg' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      {n.type?.startsWith('friend') ? (
                        <UserPlus className="w-4 h-4 text-brand-gold" />
                      ) : n.type === 'game_invite' ? (
                        <Gamepad2 className="w-4 h-4 text-brand-gold" />
                      ) : n.type?.startsWith('deposit') ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Info className="w-4 h-4 text-brand-gold" />
                      )}
                      <h4 className={`text-base font-black uppercase italic tracking-tight transition-colors ${!n.is_read ? 'text-brand-gold' : 'text-text-premium group-hover:text-brand-gold'}`}>
                        {n.title}
                      </h4>
                    </div>
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] whitespace-nowrap ml-4 mt-1 opacity-60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed group-hover:text-text-premium transition-colors mb-4">{n.body}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button 
                      onClick={() => handleNavigate(n)}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ir
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, n.id)}
                      disabled={isDeleting === n.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isDeleting === n.id ? '...' : 'Borrar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t-2 border-brand-gold/10 bg-black/40 text-center">
            <span className="text-[9px] font-black tracking-[0.3em] text-text-secondary uppercase opacity-40">Mesa Primera Exclusive Notifications</span>
          </div>
        </div>
      )}
    </div>
  );
}
