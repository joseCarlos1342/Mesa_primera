'use client';
import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

/** Botón de la cabecera del jugador que abre el chat de soporte. */
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
      type="button"
      onClick={handleClick}
      title="Soporte"
      aria-label={hasNewMessage ? 'Soporte, mensaje nuevo' : 'Soporte'}
      className={`relative inline-flex h-12 w-12 items-center justify-center rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
        hasNewMessage
          ? 'border-brand-gold bg-[#0a2c20] text-brand-gold-light'
          : 'border-[#8b6b2e]/60 text-[#d9d3bf] hover:border-brand-gold hover:text-brand-gold-light'
      }`}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
      {hasNewMessage && (
        <span
          data-testid="support-dot"
          aria-hidden="true"
          className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-gold shadow-[0_0_0_2px_#0a0a0a]"
        />
      )}
    </button>
  );
}
