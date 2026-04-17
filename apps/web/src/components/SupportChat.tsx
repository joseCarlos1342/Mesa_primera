'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, X, MessageSquare, Clock, CheckCircle2, ChevronLeft, PlusCircle, Lock, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  createSupportTicket,
  appendSupportMessage,
  closeSupportTicket,
  listUserTickets,
  getSupportTicketHistory,
  uploadSupportAttachment,
  getSupportAttachmentUrl,
  type SupportTicket,
  type SupportTicketStatus,
} from '@/app/actions/support';

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

interface TicketListItem {
  id: string;
  title: string;
  date: string;
  status: SupportTicketStatus;
  lastMessage?: string;
}

export function SupportChat({ userId, isAdmin = false, embedded = false, ticketId: initialTicketId }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [view, setView] = useState<'list' | 'chat'>(isAdmin || initialTicketId ? 'chat' : 'list');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTicketId || null);
  const [ticketStatus, setTicketStatus] = useState<SupportTicketStatus | null>(null);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFinalized = ticketStatus === 'finalized';

  useEffect(() => {
    if (embedded) setIsOpen(true);
  }, [embedded, userId]);

  // Load tickets list for player
  useEffect(() => {
    async function loadTickets() {
      if (!userId || isAdmin) return;
      const result = await listUserTickets();
      if (result.data) {
        setTickets(result.data.map(t => ({
          id: t.id,
          title: (t.last_message_preview || 'Consulta').slice(0, 30) + ((t.last_message_preview?.length || 0) > 30 ? '...' : ''),
          date: new Date(t.created_at).toLocaleDateString(),
          status: t.status,
          lastMessage: t.last_message_preview || undefined,
        })));
      }
    }
    if (isOpen && !isAdmin && view === 'list') loadTickets();
  }, [userId, isOpen, view, isAdmin]);

  // Load message history for active ticket
  useEffect(() => {
    async function loadHistory() {
      if (!activeTicketId) { setMessages([]); return; }
      const result = await getSupportTicketHistory(activeTicketId);
      if (result.data) {
        setMessages(result.data.messages.map(msg => ({
          id: msg.id,
          sender: isAdmin
            ? (msg.from_admin ? 'Tú' : 'Jugador')
            : (msg.from_admin ? 'Soporte' : 'Tú'),
          text: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticketId: msg.ticket_id,
        })));
      }
    }
    if (isOpen && (view === 'chat' || (isAdmin && userId))) loadHistory();
  }, [userId, isOpen, view, activeTicketId, isAdmin]);

  // Fetch ticket status when active ticket changes
  useEffect(() => {
    async function fetchStatus() {
      if (!activeTicketId) { setTicketStatus(null); return; }
      const { getSupportTicket } = await import('@/app/actions/support');
      const result = await getSupportTicket(activeTicketId);
      if (result.data) setTicketStatus(result.data.status);
    }
    fetchStatus();
  }, [activeTicketId]);

  // Socket.IO connection and event listeners
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
      || (typeof window !== 'undefined' && (window as any).__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_SOCKET_URL)
      || 'http://localhost:2568';
    const s = io(`${socketUrl}/support`, { withCredentials: true });
    setSocket(s);

    // Join ticket room for scoped messages
    if (activeTicketId) s.emit('support:join', activeTicketId);

    // New message in current ticket
    s.on('support:message-created', (data: { ticketId: string; message: string; from: 'player' | 'admin'; messageId: string; timestamp: string }) => {
      if (data.ticketId !== activeTicketId) return;
      const senderLabel = data.from === 'admin' ? (isAdmin ? 'Tú' : 'Soporte') : (isAdmin ? 'Usuario' : 'Tú');
      // Skip if the sender is us (optimistically added already)
      if ((data.from === 'admin' && isAdmin) || (data.from === 'player' && !isAdmin)) return;
      setMessages(prev => [...prev, {
        id: data.messageId || uuidv4(),
        sender: senderLabel,
        text: data.message,
        time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ticketId: data.ticketId,
      }]);
      if (!isAdmin && !isOpen) {
        try { const a = new Audio('/sounds/notification.mp3'); a.volume = 0.5; a.play().catch(() => {}); } catch {}
      }
      window.dispatchEvent(new CustomEvent('support-notification', { detail: data }));
    });

    // Ticket finalized
    s.on('support:ticket-finalized', (data: { ticketId: string; closedByRole: 'player' | 'admin' }) => {
      if (data.ticketId === activeTicketId) setTicketStatus('finalized');
    });

    // Ticket status changed to attended
    s.on('support:ticket-attended', (data: { ticketId: string }) => {
      if (data.ticketId === activeTicketId && ticketStatus === 'pending') setTicketStatus('attended');
    });

    // Legacy compatibility
    s.on('support:incoming', (data: { userId: string; message: string; ticketId: string }) => {
      if (isAdmin && data.userId === userId && data.ticketId === activeTicketId) {
        setMessages(prev => [...prev, { id: uuidv4(), sender: 'Usuario', text: data.message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ticketId: data.ticketId }]);
      }
    });
    s.on('support:message', (data: { userId: string; message: string; ticketId: string }) => {
      if (!isAdmin && data.userId === userId && data.ticketId === activeTicketId) {
        setMessages(prev => [...prev, { id: uuidv4(), sender: 'Soporte', text: data.message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ticketId: data.ticketId }]);
        window.dispatchEvent(new CustomEvent('support-notification', { detail: data }));
        if (!isOpen) { try { const a = new Audio('/sounds/notification.mp3'); a.volume = 0.5; a.play().catch(() => {}); } catch {} }
      }
    });
    s.on('support:resolved', (data: { userId: string; ticketId: string }) => {
      if (data.userId === userId && data.ticketId === activeTicketId) setTicketStatus('finalized');
    });

    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-support-chat', handleOpenChat);

    return () => {
      if (activeTicketId) s.emit('support:leave', activeTicketId);
      s.disconnect();
      window.removeEventListener('open-support-chat', handleOpenChat);
    };
  }, [isAdmin, userId, isOpen, activeTicketId, ticketStatus]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const startNewTicket = () => {
    setActiveTicketId(uuidv4());
    setMessages([]);
    setTicketStatus(null); // Will be set to 'pending' on first message
    setView('chat');
  };

  const handleCloseTicket = useCallback(async () => {
    if (!activeTicketId || isFinalized) return;
    setIsClosingTicket(true);
    try {
      const result = await closeSupportTicket(activeTicketId);
      if (result.error) { console.error('Error closing ticket:', result.error); return; }
      setTicketStatus('finalized');
      socket?.emit('support:ticket-finalized', { ticketId: activeTicketId, closedByRole: isAdmin ? 'admin' : 'player' });
    } finally {
      setIsClosingTicket(false);
    }
  }, [activeTicketId, isFinalized, socket, isAdmin]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !userId || isFinalized || isSending) return;

    const ticketId = activeTicketId || userId;
    const trimmed = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistic UI
    const optimisticMsg: ChatMessage = {
      id: uuidv4(),
      sender: 'Tú',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ticketId,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // First message in a new ticket: create the ticket
      if (messages.length === 0 && !isAdmin && ticketStatus === null) {
        const result = await createSupportTicket(ticketId, trimmed);
        if (result.error) { console.error('Failed to create ticket:', result.error); return; }
        setTicketStatus('pending');
        socket.emit('support:ticket-created', { ticketId, userId, username: 'Usuario', preview: trimmed.slice(0, 100) });
        socket.emit('support:message', { userId, message: trimmed, ticketId }); // Legacy
      } else {
        // Subsequent messages: use RPC
        const result = await appendSupportMessage(ticketId, trimmed);
        if (result.error) { console.error('Failed to send message:', result.error); return; }
        const from = result.data?.from || (isAdmin ? 'admin' : 'player');
        socket.emit('support:message-created', { ticketId, messageId: result.data?.message_id, message: trimmed, from, userId, timestamp: new Date().toISOString() });
        // Auto-transition: if admin replies to pending, it becomes attended
        if (isAdmin && ticketStatus === 'pending') {
          setTicketStatus('attended');
          socket.emit('support:ticket-attended', { ticketId });
        }
        // Legacy compatibility
        if (isAdmin) { socket.emit('support:reply', { userId, message: trimmed, ticketId }); }
        else { socket.emit('support:message', { userId, message: trimmed, ticketId }); }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTicketId || isFinalized) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadSupportAttachment(activeTicketId, formData);
      if (result.error) {
        console.error('Upload error:', result.error);
        // Show as system message
        setMessages(prev => [...prev, {
          id: uuidv4(),
          sender: 'Sistema',
          text: `Error: ${result.error}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ticketId: activeTicketId,
        }]);
        return;
      }
      // Show attachment as a chat message
      const isImage = file.type.startsWith('image/');
      setMessages(prev => [...prev, {
        id: result.data!.id,
        sender: 'Tú',
        text: `📎 ${file.name}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ticketId: activeTicketId,
      }]);
      socket?.emit('support:attachment-added', { ticketId: activeTicketId, fileName: file.name, mimeType: file.type });
    } finally {
      setIsUploading(false);
    }
  }, [activeTicketId, isFinalized, socket]);

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
                    ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {isFinalized ? (
          <div className="p-6 border-t border-white/5 bg-slate-900/60 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-2 text-emerald-400">
               <CheckCircle2 className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Chat Finalizado</span>
             </div>
             <p className="text-[11px] text-slate-500 text-center font-medium">Esta consulta ha sido cerrada.</p>
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
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden" onChange={handleFileSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isFinalized}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white w-10 min-w-10 h-10 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
              title="Adjuntar archivo"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isFinalized || isSending}
              placeholder={isAdmin ? "Responder al usuario..." : "Escribe tu consulta..."}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
            />
            <button 
              type="submit" 
              disabled={isSending || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white w-10 min-w-10 h-10 rounded-xl font-black transition-all flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-100 pointer-events-none">
      {isOpen && (
        <div className="pointer-events-auto fixed md:absolute bottom-0 md:bottom-8 inset-x-0 md:inset-auto md:right-8 w-full md:w-[24rem] h-[85vh] md:h-140 bg-black/80 backdrop-blur-3xl border-2 border-brand-gold/30 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-500">
          {/* Header Panel */}
          <div className="bg-brand-gold/10 border-b-2 border-brand-gold/20 p-6 flex justify-between items-center text-brand-gold shrink-0">
            <div className="flex items-center gap-3">
              {view === 'chat' && (
                <button onClick={() => setView('list')} className="p-2 hover:bg-brand-gold/10 rounded-xl transition-colors">
                  <ChevronLeft className="w-5 h-5 text-brand-gold" />
                </button>
              )}
              <div className={`w-3 h-3 rounded-full ${isFinalized ? 'bg-slate-600' : 'bg-brand-gold animate-pulse shadow-[0_0_15px_rgba(202,171,114,0.6)]'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] leading-none opacity-60">Primera Riverada</span>
                <span className="text-[13px] font-display font-black mt-1 uppercase italic tracking-wider">
                  {view === 'list' ? 'Centro de Ayuda' : isFinalized ? 'Consulta Cerrada' : 'Consulta con el Host'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view === 'chat' && !isFinalized && !isAdmin && activeTicketId && messages.length > 0 && (
                <button
                  onClick={handleCloseTicket}
                  disabled={isClosingTicket}
                  className="p-2.5 rounded-full hover:bg-red-500/10 text-brand-gold/60 hover:text-red-400 transition-colors border border-brand-gold/10 hover:border-red-500/20 disabled:opacity-50"
                  title="Cerrar consulta"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-10 h-10 rounded-full hover:bg-brand-gold/10 flex items-center justify-center transition-colors border-2 border-brand-gold/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
                    <div className="absolute inset-0 bg-linear-to-r from-brand-gold-dark via-brand-gold-light to-brand-gold-dark animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                    <div className="absolute inset-x-0 top-0 h-px bg-white/40"></div>
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/20"></div>
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
                            setTicketStatus(ticket.status);
                            setView('chat');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setActiveTicketId(ticket.id);
                              setTicketStatus(ticket.status);
                              setView('chat');
                            }
                          }}
                          className="p-5 bg-black/40 border-2 border-brand-gold/10 rounded-2xl hover:border-brand-gold/40 cursor-pointer transition-all flex justify-between items-center group shadow-xl"
                        >
                           <div className="flex flex-col gap-1 overflow-hidden pr-2">
                              <p className="text-sm font-black text-text-premium truncate group-hover:text-brand-gold transition-colors">&ldquo;{ticket.title}&rdquo;</p>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-text-secondary" />
                                <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">{ticket.date}</p>
                              </div>
                           </div>
                           <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ticket.status === 'finalized' ? 'bg-slate-700' : 'bg-brand-gold shadow-[0_0_10px_rgba(202,171,114,0.4)] animate-pulse'}`} />
                        </div>
                      ))
                    )}
                 </div>
              </div>
            ) : (
              <div className="flex-1 p-6 flex flex-col gap-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="w-24 h-24 bg-brand-gold/5 rounded-4xl flex items-center justify-center border-2 border-brand-gold/20 shadow-inner">
                      <MessageSquare className="w-10 h-10 text-brand-gold/40" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-lg font-display font-black text-brand-gold uppercase tracking-tight italic">
                        ¿Cómo podemos asistirle?
                      </p>
                      <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] leading-relaxed max-w-50 mx-auto opacity-60">
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
                          ? 'bg-linear-to-br from-brand-gold-dark to-brand-gold text-black rounded-tr-none border-white/20 shadow-[0_10px_30px_rgba(202,171,114,0.15)]' 
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
            isFinalized ? (
              <div className="p-8 border-t-2 border-brand-gold/10 bg-black/40 flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-3 text-brand-gold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Consulta Finalizada</span>
                </div>
                <p className="text-[11px] text-text-secondary text-center font-medium opacity-60">Esta sesión ha sido archivada.</p>
                
                <button 
                  onClick={startNewTicket}
                  className="w-full relative py-4 group overflow-hidden rounded-xl border-2 border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-black transition-all font-black text-[10px] uppercase tracking-[0.3em] active:scale-95"
                >
                  Nueva Solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="p-6 border-t-2 border-brand-gold/10 bg-black/20 flex gap-3 pb-8 md:pb-6">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden" onChange={handleFileSelect} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isFinalized}
                  className="bg-black/60 hover:bg-black/80 border-2 border-brand-gold/20 text-brand-gold/60 hover:text-brand-gold w-14 h-14 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
                  title="Adjuntar archivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isFinalized || isSending}
                  placeholder={isFinalized ? "SESIÓN CERRADA" : "Escriba su mensaje aquí..."}
                  className="flex-1 bg-black/60 border-2 border-brand-gold/20 rounded-xl px-5 py-4 text-sm text-text-premium placeholder:text-text-secondary/40 focus:outline-none focus:border-brand-gold transition-all shadow-inner disabled:opacity-50"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || isSending}
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
