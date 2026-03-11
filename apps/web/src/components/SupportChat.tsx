'use client';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SupportChatProps {
  userId: string;
  isAdmin?: boolean;
}

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

export function SupportChat({ userId, isAdmin = false }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:2568';
    const s = io(`${socketUrl}/support`, {
      withCredentials: true,
    });
    setSocket(s);

    s.on('support:incoming', (data) => {
      if (isAdmin) {
        setMessages(prev => [...prev, { 
          sender: data.userId, 
          text: data.message, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }]);
      }
    });

    s.on('support:message', (data) => {
      if (!isAdmin) {
        setMessages(prev => [...prev, { 
          sender: 'Soporte', 
          text: data.message, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }]);
      }
    });

    return () => {
      s.disconnect();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    const payload = { userId, message: input };
    const newMsg = { 
      sender: 'Tú', 
      text: input, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };

    if (isAdmin) {
      socket.emit('support:reply', payload);
    } else {
      socket.emit('support:message', payload);
    }
    
    setMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-80 h-96 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl shadow-2xl flex flex-col mb-4 overflow-hidden">
          <div className="bg-[var(--accent-gold)] p-3 flex justify-between items-center text-[var(--bg-primary)] font-bold">
            <span>{isAdmin ? 'Admin Chat' : 'Soporte en línea'}</span>
            <button onClick={() => setIsOpen(false)} className="text-xl leading-none">&times;</button>
          </div>
          
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center mt-10">
                {isAdmin ? 'Esperando mensajes de jugadores...' : '¿En qué te podemos ayudar?'}
              </p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex flex-col max-w-[80%] ${msg.sender === 'Tú' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <span className="text-[10px] text-[var(--text-secondary)] mb-1">{msg.sender} • {msg.time}</span>
                  <div className={`px-3 py-2 rounded-xl text-sm ${msg.sender === 'Tú' ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] rounded-tr-none' : 'bg-[#2a2a4a] text-[var(--text-primary)] rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t border-[var(--border-glow)] bg-[#1a1a2e] flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..." 
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
            />
            <button type="submit" className="bg-[var(--accent-gold)] text-[var(--bg-primary)] px-3 py-2 rounded-lg font-bold">
              Enviar
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[var(--accent-gold)] text-[var(--bg-primary)] rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform"
        >
          💬
        </button>
      )}
    </div>
  );
}
