'use client';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

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
        className="w-16 h-16 bg-[var(--bg-card)] rounded-full flex items-center justify-center text-3xl md:text-4xl border-[3px] border-[var(--border-glow)] hover:bg-[#2a2a4a] transition-all relative shadow-xl"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-[var(--accent-red)] text-white text-sm md:text-base font-black w-8 h-8 flex items-center justify-center rounded-full shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-16 md:top-20 right-0 w-[22rem] md:w-[28rem] bg-[var(--bg-card)] border-2 border-[var(--border-glow)] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
          <div className="p-4 md:p-6 border-b-2 border-[var(--border-glow)] flex justify-between items-center bg-[#1a1a2e]">
            <h3 className="text-xl md:text-2xl font-black text-[var(--accent-gold)] tracking-wide">Notificaciones</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-sm md:text-base font-bold text-[var(--text-secondary)] hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-xl hover:bg-white/5">
                Marcar leídas
              </button>
            )}
          </div>
          
          <div className="max-h-[32rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 md:p-12 text-center text-lg md:text-xl font-medium text-[var(--text-secondary)]">
                No tienes notificaciones nuevas
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-5 md:p-6 border-b border-[#2a2a4a] hover:bg-[#1a1a2e] transition-colors ${!n.read ? 'bg-[#2a2a4a]/30 border-l-4 border-l-[var(--accent-gold)]' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`text-lg md:text-xl font-black ${!n.read ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
                      {n.title}
                    </h4>
                    <span className="text-sm font-bold text-[var(--text-secondary)] whitespace-nowrap ml-4">{n.time}</span>
                  </div>
                  <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
