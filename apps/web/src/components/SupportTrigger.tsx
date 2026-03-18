'use client';
import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

export function SupportTrigger() {
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    const handleNotification = () => setHasNewMessage(true);
    window.addEventListener('support-notification', handleNotification);
    return () => window.removeEventListener('support-notification', handleNotification);
  }, []);

  const handleClick = () => {
    setHasNewMessage(false);
    window.dispatchEvent(new CustomEvent('open-support-chat'));
  };

  return (
    <button 
      onClick={handleClick}
      className={`relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl transition-all active:scale-90 shadow-xl ${
        hasNewMessage 
          ? 'bg-indigo-600 text-white animate-bounce shadow-indigo-600/40' 
          : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
      }`}
      title="Soporte"
    >
      <MessageSquare className="w-6 h-6 md:w-7 md:h-7" />
      {hasNewMessage && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-950 shadow-lg animate-pulse" />
      )}
    </button>
  );
}
