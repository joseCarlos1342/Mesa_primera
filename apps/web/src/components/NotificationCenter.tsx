'use client';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bell, X, CheckCircle, Info, BellRing } from 'lucide-react';

interface NotificationCenterProps {
  userId: string;
}

interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:2568';
    const s = io(`${socketUrl}/notifications`, {
      withCredentials: true,
    });
    
    s.on('connect', () => {
      s.emit('register', userId);
    });

    s.on('notification', (data) => {
      const newNotif = {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title,
        body: data.body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Attempt to play a sound
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {}); // ignore autoplay errors
      } catch (e) {}
    });

    return () => {
      s.disconnect();
    };
  }, [userId]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
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
                Limpiar Bóveda
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
                <div key={n.id} className={`group p-6 rounded-[1.5rem] transition-all duration-300 border-2 ${!n.read ? 'bg-brand-gold/10 border-brand-gold/30 shadow-lg' : 'hover:bg-white/5 border-transparent hover:border-white/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`text-base font-black uppercase italic tracking-tight transition-colors ${!n.read ? 'text-brand-gold' : 'text-text-premium group-hover:text-brand-gold'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] whitespace-nowrap ml-4 mt-1 opacity-60">{n.time}</span>
                  </div>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed group-hover:text-text-premium transition-colors">{n.body}</p>
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
