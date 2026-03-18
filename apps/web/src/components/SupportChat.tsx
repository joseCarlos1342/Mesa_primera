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
        data.forEach(msg => {
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
        setMessages(data.map(msg => ({
          sender: msg.from_admin ? 'Soporte' : 'Tú',
          text: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticketId: msg.ticket_id
        })));
        
        const lastMsg = data[data.length - 1];
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
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:2568';
    const s = io(`${socketUrl}/support`, {
      withCredentials: true,
    });
    setSocket(s);

    s.on('support:incoming', (data) => {
      if (isAdmin && data.userId === userId) {
        setMessages(prev => [...prev, { 
          sender: 'Usuario', 
          text: data.message, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticketId: data.ticketId
        }]);
      }
    });

    s.on('support:message', (data) => {
      if (!isAdmin && data.userId === userId && data.ticketId === activeTicketId) {
        setMessages(prev => [...prev, { 
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
           } catch (e) {}
        }
      }
    });

    s.on('support:resolved', (data) => {
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
            messages.map((msg, i) => (
              <div key={i} className={`flex flex-col max-w-[90%] ${msg.sender === 'Tú' || (isAdmin && msg.sender === 'Soporte') ? 'self-end items-end' : 'self-start items-start'}`}>
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
        <div className="pointer-events-auto fixed md:absolute bottom-0 md:bottom-8 inset-x-0 md:inset-auto md:right-8 w-full md:w-[22rem] h-[85vh] md:h-[32rem] bg-slate-900 border-t md:border border-white/10 rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-500">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 flex justify-between items-center text-white shrink-0 shadow-lg shadow-indigo-900/20">
            <div className="flex items-center gap-3">
              {view === 'chat' && (
                <button onClick={() => setView('list')} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-indigo-200" />
                </button>
              )}
              <div className={`w-2.5 h-2.5 rounded-full ${isResolved ? 'bg-slate-400' : 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none opacity-80">Mesa Primera</span>
                <span className="text-xs font-bold mt-1">
                  {view === 'list' ? 'Centro de Ayuda' : isResolved ? 'Consulta Finalizada' : 'Soporte en línea'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-slate-950 custom-scrollbar flex flex-col">
            {view === 'list' ? (
              <div className="p-5 space-y-4">
                 <button 
                   onClick={startNewTicket}
                   className="w-full p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4 hover:bg-indigo-600/20 transition-all group"
                 >
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/40 group-hover:scale-110 transition-transform">
                       <PlusCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                       <p className="text-sm font-black text-white italic uppercase tracking-tighter">Nueva Consulta</p>
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Inicia un chat en vivo</p>
                    </div>
                 </button>

                 <div className="pt-4 space-y-3">
                    <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2 italic">Historial de Tickets</h4>
                    {tickets.length === 0 ? (
                      <div className="text-center py-12 opacity-30 italic text-xs">No tienes consultas previas</div>
                    ) : (
                      tickets.map(ticket => (
                        <div 
                          key={ticket.id}
                          onClick={() => {
                            setActiveTicketId(ticket.id);
                            setIsResolved(ticket.isResolved);
                            setView('chat');
                          }}
                          className="p-4 bg-slate-900 border border-white/5 rounded-2xl hover:border-white/10 cursor-pointer transition-all flex justify-between items-center group"
                        >
                           <div className="flex flex-col gap-1 overflow-hidden pr-2">
                              <p className="text-xs font-black text-slate-200 truncate group-hover:text-white">"{ticket.title}"</p>
                              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{ticket.date}</p>
                           </div>
                           <div className={`w-2 h-2 rounded-full shrink-0 ${ticket.isResolved ? 'bg-slate-700' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse'}`} />
                        </div>
                      ))
                    )}
                 </div>
              </div>
            ) : (
              <div className="flex-1 p-5 flex flex-col gap-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/5 shadow-inner">
                      <span className="text-3xl animate-bounce">💬</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-black text-white uppercase tracking-tight italic">
                        ¿En qué podemos ayudar?
                      </p>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">
                        Explícanos tu situación y en breve<br/>te atenderemos.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col max-w-[85%] ${msg.sender === 'Tú' ? 'self-end items-end' : 'self-start items-start'}`}>
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 px-1">
                        {msg.sender} • {msg.time}
                      </span>
                      <div className={`px-4 py-2 rounded-2xl text-[12px] font-medium leading-relaxed shadow-md ${
                        msg.sender === 'Tú' 
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
            )}
          </div>

          {/* Footer Input */}
          {view === 'chat' && (
            isResolved ? (
              <div className="p-6 border-t border-white/5 bg-slate-900 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Chat Resuelto</span>
                </div>
                <p className="text-[10px] text-slate-500 text-center font-medium">Esta consulta ha sido cerrada por el equipo técnico.</p>
                <button 
                  onClick={startNewTicket}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                >
                  Iniciar nueva consulta
                </button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="p-4 border-t border-white/5 bg-slate-900 flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isResolved}
                  placeholder={isResolved ? "Chat cerrado" : "Escribe tu consulta..."}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white w-11 h-11 rounded-xl font-black transition-all flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-90"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )
          )}
        </div>
      )}
    </div>
  );
}
