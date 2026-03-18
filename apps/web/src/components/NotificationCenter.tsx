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
        className="w-12 h-12 md:w-16 md:h-16 bg-slate-900/80 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all relative shadow-2xl active:scale-95 group backdrop-blur-md"
      >
        <Bell className={`w-6 h-6 md:w-8 md:h-8 transition-all ${unreadCount > 0 ? 'text-indigo-400 animate-pulse' : 'text-slate-400 group-hover:text-white'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-rose-600 text-white text-[10px] md:text-xs font-black w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(225,29,72,0.5)] border-2 border-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed md:absolute top-24 md:top-20 inset-x-4 md:inset-auto md:right-0 w-auto md:w-[28rem] bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Notificaciones</h3>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-xl hover:bg-white/5">
                Marcar leídas
              </button>
            )}
          </div>
          
          <div className="max-h-[70vh] md:max-h-[32rem] overflow-y-auto custom-scrollbar p-2">
            {notifications.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-20">
                    <Bell className="w-8 h-8" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-5 rounded-2xl mb-1 transition-all ${!n.read ? 'bg-indigo-600/10 border border-indigo-500/20' : 'hover:bg-white/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`text-sm font-black uppercase tracking-tight ${!n.read ? 'text-indigo-400' : 'text-slate-200'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap ml-4">{n.time}</span>
                  </div>
                  <p className="text-[13px] font-medium text-slate-400 leading-relaxed">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
