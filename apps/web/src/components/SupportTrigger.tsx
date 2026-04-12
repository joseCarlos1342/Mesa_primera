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
      className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl transition-all active:scale-90 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 backdrop-blur-xl ${
        hasNewMessage 
          ? 'bg-brand-gold/20 border-brand-gold shadow-brand-gold/20 animate-pulse' 
          : 'bg-black/40 border-brand-gold/20 text-brand-gold hover:border-brand-gold/50 hover:bg-black/60'
      }`}
      title="Soporte con el Host"
      aria-label="Soporte con el Host"
    >
      <MessageSquare className={`w-5 h-5 md:w-6 md:h-6 ${hasNewMessage ? 'text-brand-gold' : 'text-text-secondary group-hover:text-brand-gold'}`} />
      {hasNewMessage && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-brand-gold-light to-brand-gold-dark rounded-full border-2 border-slate-950 shadow-[0_0_10px_rgba(202,171,114,0.6)] animate-bounce" />
      )}
    </button>
  );
}
