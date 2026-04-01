'use client';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, X, MessageSquare, Clock, CheckCircle2, ChevronLeft, PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SupportChatProps {
  userId: string;
  isAdmin?: boolean;
  embedded?: boolean;
  ticketId?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  ticketId: string;
}

interface Ticket {
  id: string;
  title: string;
  date: string;
  isResolved: boolean;
  lastMessage?: string;
}

interface SupportMessageRow {
  id?: string;
  user_id: string;
  ticket_id: string;
  message: string;
  created_at: string;
  from_admin: boolean;
  is_resolved: boolean;
}

interface SupportSocketPayload {
  userId: string;
  message: string;
  ticketId: string;
}

export function SupportChat({ userId, isAdmin = false, embedded = false, ticketId: initialTicketId }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [view, setView] = useState<'list' | 'chat'>(isAdmin || initialTicketId ? 'chat' : 'list');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTicketId || null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedded) setIsOpen(true);
  }, [embedded, userId]);

  // Load Ticket History for the user
  useEffect(() => {
    async function loadTickets() {
      if (!userId || isAdmin) return;
      
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        const grouped: Record<string, Ticket> = {};
        (data as SupportMessageRow[]).forEach((msg) => {
          if (!grouped[msg.ticket_id]) {
            grouped[msg.ticket_id] = {
              id: msg.ticket_id,
              title: msg.message.slice(0, 30) + (msg.message.length > 30 ? '...' : ''),
              date: new Date(msg.created_at).toLocaleDateString(),
              isResolved: msg.is_resolved || false,
              lastMessage: msg.message
            };
          } else {
            grouped[msg.ticket_id].isResolved = msg.is_resolved || grouped[msg.ticket_id].isResolved;
            grouped[msg.ticket_id].lastMessage = msg.message;
          }
        });
        
        setTickets(Object.values(grouped).sort((a, b) => b.id.localeCompare(a.id)));
      }
    }

    if (isOpen && !isAdmin && view === 'list') {
      loadTickets();
    }
  }, [userId, isOpen, view, isAdmin]);

  // Load History for a specific ticket or user
  useEffect(() => {
    async function loadHistory() {
      if (!userId) {
        setMessages([]);
        return;
      }
      
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      let query = supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', userId);
        
      if (activeTicketId) {
        query = query.eq('ticket_id', activeTicketId);
      }
        
      const { data, error } = await query.order('created_at', { ascending: true });
        
      if (!error && data) {
        const typedMessages = data as SupportMessageRow[];

        setMessages(typedMessages.map((msg) => ({
          id: msg.id || `${msg.created_at}-${msg.message.slice(0,10)}`,
          sender: msg.from_admin ? 'Soporte' : 'Tú',
          text: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticketId: msg.ticket_id
        })));
        
        const lastMsg = typedMessages[typedMessages.length - 1];
        if (lastMsg?.is_resolved) {
          setIsResolved(true);
        } else {
          setIsResolved(false);
        }
      }
    }

    if (isOpen && (view === 'chat' || (isAdmin && userId))) {
      loadHistory();
    }
  }, [userId, isOpen, view, activeTicketId, isAdmin]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
      || (typeof window !== 'undefined' && (window as any).__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_SOCKET_URL)
      || 'http://localhost:2568';
    const s = io(`${socketUrl}/support`, {
      withCredentials: true,
    });
    setSocket(s);

    s.on('support:incoming', (data: SupportSocketPayload) => {
      if (isAdmin && data.userId === userId) {
        setMessages(prev => [...prev, { 
          id: uuidv4(),
          sender: 'Usuario', 
          text: data.message, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticketId: data.ticketId
        }]);
      }
    });

    s.on('support:message', (data: SupportSocketPayload) => {
      if (!isAdmin && data.userId === userId && data.ticketId === activeTicketId) {
        setMessages(prev => [...prev, { 
          id: uuidv4(),
          sender: 'Soporte', 
          text: data.message, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticketId: data.ticketId
        }]);

        window.dispatchEvent(new CustomEvent('support-notification', { detail: data }));
        
        if (!isOpen) {
           try {
             const audio = new Audio('/sounds/notification.mp3');
             audio.volume = 0.5;
             audio.play().catch(() => {});
           } catch { /* audio play not critical */ }
        }
      }
    });

    s.on('support:resolved', (data: SupportSocketPayload) => {
      if (data.userId === userId && data.ticketId === activeTicketId) {
        setIsResolved(true);
      }
    });

    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-support-chat', handleOpenChat);

    return () => {
      s.disconnect();
      window.removeEventListener('open-support-chat', handleOpenChat);
    };
  }, [isAdmin, userId, isOpen, activeTicketId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const startNewTicket = () => {
    setActiveTicketId(uuidv4());
    setMessages([]);
    setIsResolved(false);
    setView('chat');
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !userId || isResolved) return;
    
    // Default ticketId if none active (fallback for legacy)
    const ticketId = activeTicketId || userId;
    
    const payload = { userId, message: input, ticketId };
    const newMsg = { 
      id: uuidv4(),
      sender: 'Tú', 
      text: input, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ticketId
    };

    (async () => {
      try {
        const { createClient: createSupabaseClient } = await import('@/utils/supabase/client');
        const supabase = createSupabaseClient();
        await supabase.from('support_messages').insert({
          user_id: userId,
          message: input,
          from_admin: isAdmin,
          ticket_id: ticketId
        });
      } catch (err) {
        console.error('Failed to persist message:', err);
      }
    })();

    if (isAdmin) {
      socket.emit('support:reply', payload);
    } else {
      socket.emit('support:message', payload);
    }
    
    setMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  if (embedded) {
    return (
      <div className="flex flex-col h-full bg-slate-950/20">
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-50">
               <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5">
                 <MessageSquare className="w-8 h-8 text-slate-500" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sin mensajes previos</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col max-w-[90%] ${msg.sender === 'Tú' || (isAdmin && msg.sender === 'Soporte') ? 'self-end items-end' : 'self-start items-start'}`}>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 px-1">
                  {msg.sender} • {msg.time}
                </span>
                <div className={`px-4 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-md ${
                  msg.sender === 'Tú' || (isAdmin && msg.sender === 'Soporte')
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {isResolved ? (
          <div className="p-6 border-t border-white/5 bg-slate-900/60 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-2 text-emerald-400">
               <CheckCircle2 className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Chat Resuelto</span>
             </div>
             <p className="text-[11px] text-slate-500 text-center font-medium">Esta consulta ha sido cerrada por el equipo técnico.</p>
             {!isAdmin && (
               <button 
                 onClick={startNewTicket}
                 className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
               >
                 Iniciar nueva consulta
               </button>
             )}
          </div>
        ) : (
          <form onSubmit={sendMessage} className="p-4 border-t border-white/5 bg-slate-900/40 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isResolved}
              placeholder={isResolved ? (isAdmin ? "Chat cerrado para edición" : "Chat resuelto") : (isAdmin ? "Responder al usuario..." : "Escribe tu consulta...")}
              className={`flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all shadow-inner ${isResolved ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white w-10 min-w-[40px] h-10 rounded-xl font-black transition-all flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-90"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {isOpen && (
        <div className="pointer-events-auto fixed md:absolute bottom-0 md:bottom-8 inset-x-0 md:inset-auto md:right-8 w-full md:w-[24rem] h-[85vh] md:h-[35rem] bg-black/80 backdrop-blur-3xl border-2 border-brand-gold/30 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-500">
          {/* Header Panel */}
          <div className="bg-brand-gold/10 border-b-2 border-brand-gold/20 p-6 flex justify-between items-center text-brand-gold shrink-0">
            <div className="flex items-center gap-3">
              {view === 'chat' && (
                <button onClick={() => setView('list')} className="p-2 hover:bg-brand-gold/10 rounded-xl transition-colors">
                  <ChevronLeft className="w-5 h-5 text-brand-gold" />
                </button>
              )}
              <div className={`w-3 h-3 rounded-full ${isResolved ? 'bg-slate-600' : 'bg-brand-gold animate-pulse shadow-[0_0_15px_rgba(202,171,114,0.6)]'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] leading-none opacity-60">Primera Riverada</span>
                <span className="text-[13px] font-display font-black mt-1 uppercase italic tracking-wider">
                  {view === 'list' ? 'Centro de Ayuda' : isResolved ? 'Consulta Cerrada' : 'Consulta con el Host'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="w-10 h-10 rounded-full hover:bg-brand-gold/10 flex items-center justify-center transition-colors border-2 border-brand-gold/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body Content */}
          <div className="flex-1 overflow-y-auto bg-transparent custom-scrollbar flex flex-col">
            {view === 'list' ? (
              <div className="p-6 space-y-6">
                 {/* New Ticket Button - Tactile Gold Style */}
                 <button 
                   onClick={startNewTicket}
                   className="w-full group relative h-20 overflow-hidden rounded-2xl transition-all active:scale-[0.98] shadow-[0_10px_20px_rgba(202,171,114,0.2)]"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-gold-dark via-brand-gold-light to-brand-gold-dark animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-white/40"></div>
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/20"></div>
                    <div className="relative flex items-center justify-center gap-4">
                       <PlusCircle className="w-6 h-6 text-black" />
                       <div className="text-left">
                          <p className="text-sm font-black text-black italic uppercase tracking-tighter">Nueva Consulta</p>
                          <p className="text-[9px] text-black/60 font-black uppercase tracking-[0.2em]">Inicia un chat en vivo</p>
                       </div>
                    </div>
                 </button>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-brand-gold/60 uppercase tracking-[0.3em] px-2 italic">Historial de Tickets</h4>
                    {tickets.length === 0 ? (
                      <div className="text-center py-16 opacity-30 italic text-xs text-text-secondary uppercase tracking-widest">No tienes consultas previas</div>
                    ) : (
                      tickets.map(ticket => (
                        <div 
                          key={ticket.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setActiveTicketId(ticket.id);
                            setIsResolved(ticket.isResolved);
                            setView('chat');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setActiveTicketId(ticket.id);
                              setIsResolved(ticket.isResolved);
                              setView('chat');
                            }
                          }}
                          className="p-5 bg-black/40 border-2 border-brand-gold/10 rounded-2xl hover:border-brand-gold/40 cursor-pointer transition-all flex justify-between items-center group shadow-xl"
                        >
                           <div className="flex flex-col gap-1 overflow-hidden pr-2">
                              <p className="text-sm font-black text-text-premium truncate group-hover:text-brand-gold transition-colors">"{ticket.title}"</p>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-text-secondary" />
                                <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">{ticket.date}</p>
                              </div>
                           </div>
                           <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ticket.isResolved ? 'bg-slate-700' : 'bg-brand-gold shadow-[0_0_10px_rgba(202,171,114,0.4)] animate-pulse'}`} />
                        </div>
                      ))
                    )}
                 </div>
              </div>
            ) : (
              <div className="flex-1 p-6 flex flex-col gap-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="w-24 h-24 bg-brand-gold/5 rounded-[2rem] flex items-center justify-center border-2 border-brand-gold/20 shadow-inner">
                      <MessageSquare className="w-10 h-10 text-brand-gold/40" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-lg font-display font-black text-brand-gold uppercase tracking-tight italic">
                        ¿Cómo podemos asistirle?
                      </p>
                      <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] leading-relaxed max-w-[200px] mx-auto opacity-60">
                        NUESTRO EQUIPO DE CONSERJERÍA ESTÁ DISPONIBLE PARA AYUDARLE.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.sender === 'Tú' ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`flex items-center gap-2 mb-1.5 px-1 ${msg.sender === 'Tú' ? 'flex-row-reverse' : ''}`}>
                         <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest opacity-60">
                           {msg.sender === 'Tú' ? 'MEMBRESÍA ELITE' : 'CONSERJERÍA'}
                         </span>
                         <span className="text-[9px] font-bold text-text-secondary opacity-40">• {msg.time}</span>
                      </div>
                      <div className={`px-5 py-3 rounded-2xl text-[13px] font-medium leading-relaxed shadow-xl border ${
                        msg.sender === 'Tú' 
                          ? 'bg-gradient-to-br from-brand-gold-dark to-brand-gold text-black rounded-tr-none border-white/20 shadow-[0_10px_30px_rgba(202,171,114,0.15)]' 
                          : 'bg-black/60 text-text-premium rounded-tl-none border-brand-gold/30 shadow-black'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input Area */}
          {view === 'chat' && (
            isResolved ? (
              <div className="p-8 border-t-2 border-brand-gold/10 bg-black/40 flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-3 text-brand-gold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Consulta Finalizada</span>
                </div>
                <p className="text-[11px] text-text-secondary text-center font-medium opacity-60">Esta sesión ha sido archivada por el Host.</p>
                
                <button 
                  onClick={startNewTicket}
                  className="w-full relative py-4 group overflow-hidden rounded-xl border-2 border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-black transition-all font-black text-[10px] uppercase tracking-[0.3em] active:scale-95"
                >
                  Nueva Solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="p-6 border-t-2 border-brand-gold/10 bg-black/20 flex gap-3 pb-8 md:pb-6">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isResolved}
                  placeholder={isResolved ? "SESIÓN CERRADA" : "Escriba su mensaje aquí..."}
                  className="flex-1 bg-black/60 border-2 border-brand-gold/20 rounded-xl px-5 py-4 text-sm text-text-premium placeholder:text-text-secondary/40 focus:outline-none focus:border-brand-gold transition-all shadow-inner disabled:opacity-50"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim()}
                  className="bg-brand-gold hover:bg-brand-gold-light text-black w-14 h-14 rounded-xl font-black transition-all flex items-center justify-center shadow-[0_10px_20px_rgba(202,171,114,0.3)] active:scale-90 disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            )
          )}
        </div>
      )}
    </div>
  );
}
