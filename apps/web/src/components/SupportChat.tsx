'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, MessageSquare, Clock, CheckCircle2, ChevronLeft, ChevronRight, PlusCircle, Lock, Paperclip, AlertTriangle } from 'lucide-react';
import { PlayerSheet } from '@/components/player/PlayerSheet';
import { v4 as uuidv4 } from 'uuid';
import {
  createSupportTicket,
  createSupportIssue,
  appendSupportMessage,
  closeSupportTicket,
  listUserTickets,
  getSupportTicketHistory,
  uploadSupportAttachment,
  type SupportTicketStatus,
  type SupportIssueCategory,
} from '@/app/actions/support';
import { getPlayerIssueMessages, listPlayerIssueTickets, type AdminIssueTicket, type IssueTicketMessage } from '@/app/actions/admin-issues';
import { closeIssueTicket } from '@/app/actions/admin-issues';
import { IssueAttachmentComposer } from '@/components/IssueAttachmentComposer';
import { IssueAttachmentList } from '@/components/IssueAttachmentList';
import { createClient } from '@/utils/supabase/client';

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

const issueCategoryOptions: ReadonlyArray<{ value: SupportIssueCategory; label: string; description: string }> = [
  { value: 'deposit_missing', label: 'Depósito no acreditado', description: 'Fondos enviados que aún no aparecen.' },
  { value: 'transfer_missing', label: 'Transferencia no recibida', description: 'Una transferencia pendiente de confirmar.' },
  { value: 'withdrawal_missing', label: 'Retiro no recibido', description: 'Fondos retirados que no llegaron a destino.' },
  { value: 'table_error', label: 'Error en mesa o partida', description: 'Una incidencia durante el juego.' },
  { value: 'other', label: 'Otro problema', description: 'Cuéntanos qué ocurrió.' },
];

export function SupportChat({ userId, isAdmin = false, embedded = false, ticketId: initialTicketId }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [view, setView] = useState<'list' | 'chat' | 'issue' | 'issues'>(isAdmin || initialTicketId ? 'chat' : 'list');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTicketId || null);
  const [ticketStatus, setTicketStatus] = useState<SupportTicketStatus | null>(null);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [issueCategory, setIssueCategory] = useState<SupportIssueCategory>('deposit_missing');
  const [issueReference, setIssueReference] = useState('');
  const [issueTableReference, setIssueTableReference] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issues, setIssues] = useState<AdminIssueTicket[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<AdminIssueTicket | null>(null);
  const [issueMessages, setIssueMessages] = useState<IssueTicketMessage[]>([]);
  const [attachmentVersion, setAttachmentVersion] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingSocketEventsRef = useRef<Array<[string, unknown]>>([]);

  const isFinalized = ticketStatus === 'finalized';

  const emitSocketEvent = useCallback((event: string, payload: unknown) => {
    if (socketRef.current) {
      socketRef.current.emit(event, payload);
      return;
    }
    pendingSocketEventsRef.current.push([event, payload]);
  }, []);

  useEffect(() => {
    if (!isOpen || isAdmin || view !== 'issues') return;
    listPlayerIssueTickets().then((result) => { if (result.data) setIssues(result.data); });
  }, [isOpen, isAdmin, view]);

  useEffect(() => {
    if (!selectedIssue) return;
    getPlayerIssueMessages(selectedIssue.id).then((result) => { if (result.data) setIssueMessages(result.data); });
  }, [selectedIssue]);

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
    let cancelled = false;
    let s: Socket | null = null;
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-support-chat', handleOpenChat);

    void (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.access_token) return;

    const socketUrl = (typeof window !== 'undefined' && (window as any).__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_SOCKET_URL)
      || process.env.NEXT_PUBLIC_SOCKET_URL
      || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'https:' : 'http:'}//${window.location.hostname}:2568` : 'http://127.0.0.1:2568');
    s = io(`${socketUrl}/support`, {
      auth: { accessToken: session.access_token },
      withCredentials: true,
    });
    socketRef.current = s;
    for (const [event, payload] of pendingSocketEventsRef.current.splice(0)) {
      s.emit(event, payload);
    }

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
        try { const a = new Audio('/sounds/notification.mp3'); a.volume = 0.5; a.play().catch(() => undefined); } catch { /* Audio no disponible. */ }
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

    // Legacy support events are intentionally not subscribed.
    })();

    return () => {
      cancelled = true;
      if (activeTicketId) s?.emit('support:leave', activeTicketId);
      s?.disconnect();
      socketRef.current = null;
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

  const isFinancialIssue = ['deposit_missing', 'transfer_missing', 'withdrawal_missing'].includes(issueCategory);

  const submitIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isReportingIssue || !issueMessage.trim()) return;
    setIsReportingIssue(true);
    setIssueError(null);
    try {
      const result = await createSupportIssue({
        category: issueCategory,
        message: issueMessage.trim(),
        transactionReference: isFinancialIssue ? issueReference.trim() || undefined : undefined,
        tableReference: issueCategory === 'table_error' ? issueTableReference.trim() || undefined : undefined,
        occurredAt: new Date().toISOString(),
      });
      if (result.error || !result.data) {
        setIssueError(result.error || 'No fue posible registrar el reclamo. Inténtalo de nuevo.');
        return;
      }

      const ticketId = result.data.ticket_id;
      setSelectedIssue({ id: ticketId, user_id: userId, category: issueCategory, description: issueMessage.trim(), transaction_reference: isFinancialIssue ? issueReference.trim() || null : null, table_reference: issueCategory === 'table_error' ? issueTableReference.trim() || null : null, occurred_at: new Date().toISOString(), status: 'open', resolution_notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      setIssueMessages([{ id: result.data.message_id, ticket_id: ticketId, message: issueMessage.trim(), from_admin: false, created_at: new Date().toISOString() }]);
      setIssueMessage('');
      setIssueReference('');
      setIssueTableReference('');
      setView('issues');
    } finally {
      setIsReportingIssue(false);
    }
  };

  const handleCloseTicket = useCallback(async () => {
    if (!activeTicketId || isFinalized) return;
    setIsClosingTicket(true);
    try {
      const result = await closeSupportTicket(activeTicketId);
      if (result.error) { console.error('Error closing ticket:', result.error); return; }
      setTicketStatus('finalized');
      emitSocketEvent('support:ticket-finalized', { ticketId: activeTicketId, closedByRole: isAdmin ? 'admin' : 'player' });
    } finally {
      setIsClosingTicket(false);
    }
  }, [activeTicketId, isFinalized, emitSocketEvent, isAdmin]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId || isFinalized || isSending) return;

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
        emitSocketEvent('support:ticket-created', { ticketId, userId, username: 'Usuario', preview: trimmed.slice(0, 100) });
      } else {
        // Subsequent messages: use RPC
        const result = await appendSupportMessage(ticketId, trimmed);
        if (result.error) { console.error('Failed to send message:', result.error); return; }
        const from = result.data?.from || (isAdmin ? 'admin' : 'player');
        emitSocketEvent('support:message-created', { ticketId, messageId: result.data?.message_id, message: trimmed, from, userId, timestamp: new Date().toISOString() });
        // Auto-transition: if admin replies to pending, it becomes attended
        if (isAdmin && ticketStatus === 'pending') {
          setTicketStatus('attended');
          emitSocketEvent('support:ticket-attended', { ticketId });
        }
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
      setMessages(prev => [...prev, {
        id: result.data!.id,
        sender: 'Tú',
        text: `📎 ${file.name}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ticketId: activeTicketId,
      }]);
      emitSocketEvent('support:attachment-added', { ticketId: activeTicketId, fileName: file.name, mimeType: file.type });
    } finally {
      setIsUploading(false);
    }
  }, [activeTicketId, isFinalized, emitSocketEvent]);

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

  const headerTitle =
    view === 'list' ? 'Soporte' : view === 'issue' ? 'Reportar un problema' : view === 'issues' ? 'Mis reclamos' : isFinalized ? 'Consulta cerrada' : 'Consulta con soporte';
  const headerDescription =
    view === 'list'
      ? 'Escríbenos o reporta un problema con tu saldo o una mesa.'
      : view === 'chat'
        ? isFinalized
          ? 'Esta consulta quedó archivada.'
          : 'Te responde el equipo del club.'
        : undefined;

  const footer =
    view === 'chat' ? (
      isFinalized ? (
        <div className="space-y-3 text-center">
          <p className="flex items-center justify-center gap-2 text-base font-semibold text-[#7fe0a6]">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Consulta finalizada
          </p>
          <button type="button" onClick={startNewTicket} className={supportPrimary}>
            Nueva consulta
          </button>
        </div>
      ) : (
        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden" onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isFinalized}
            aria-label="Adjuntar archivo"
            title="Adjuntar archivo"
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#8b6b2e]/70 text-[#d9d3bf] transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5" aria-hidden="true" />
          </button>
          <label htmlFor="support-message" className="sr-only">
            Mensaje para soporte
          </label>
          <input
            id="support-message"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isFinalized || isSending}
            placeholder="Escribe tu mensaje…"
            className="h-14 min-w-0 flex-1 rounded-lg border border-[#8b6b2e]/70 bg-[#0a0a0a] px-4 text-lg text-text-premium caret-brand-gold outline-none transition-colors placeholder:text-[#8a8478] focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/35 disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            disabled={!input.trim() || isSending}
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-gold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-50"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
      )
    ) : undefined;

  const backButton =
    view !== 'list' ? (
      <button
        type="button"
        onClick={() => (view === 'issues' && selectedIssue ? setSelectedIssue(null) : setView('list'))}
        aria-label="Volver"
        className="-ml-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-[#d9d3bf] transition-colors hover:bg-[#35180f] hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
      >
        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
      </button>
    ) : undefined;

  return (
    <PlayerSheet
      open={isOpen}
      onClose={() => setIsOpen(false)}
      variant="full"
      title={headerTitle}
      description={headerDescription}
      closeLabel="Cerrar soporte"
      headerStart={backButton}
      footer={footer}
    >
      {view === 'chat' && !isFinalized && activeTicketId && messages.length > 0 && (
        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={handleCloseTicket}
            disabled={isClosingTicket}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#8b6b2e]/60 px-3 text-base font-semibold text-[#d9d3bf] transition-colors hover:border-[#e74c3c]/70 hover:text-[#f08a7e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-50"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Cerrar consulta
          </button>
        </div>
      )}

      {view === 'list' ? (
        <div className="space-y-8 pt-2">
          <div className="space-y-3">
            <button type="button" onClick={startNewTicket} className={supportPrimary}>
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
              Nueva consulta
            </button>
            <button type="button" onClick={() => setView('issue')} className={supportRow}>
              <AlertTriangle className="h-6 w-6 shrink-0 text-brand-gold-light" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-text-premium">Reportar un problema</span>
                <span className="block text-base text-[#bdb7a6]">Cargas, transferencias, retiros o errores de mesa</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#c5a059]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIssue(null);
                setView('issues');
              }}
              className={supportRow}
            >
              <Clock className="h-6 w-6 shrink-0 text-brand-gold-light" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-text-premium">Mis reclamos</span>
                <span className="block text-base text-[#bdb7a6]">Consulta el estado y las respuestas del caso</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#c5a059]" aria-hidden="true" />
            </button>
          </div>

          <section aria-labelledby="support-history">
            <h3 id="support-history" className="border-b border-[#8b6b2e]/45 pb-2 font-display text-[1.375rem] font-bold text-text-premium">
              Tus consultas
            </h3>
            {tickets.length === 0 ? (
              <p className="py-8 text-center text-lg text-[#bdb7a6]">No tienes consultas previas.</p>
            ) : (
              <ul className="divide-y divide-[#8b6b2e]/30">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTicketId(ticket.id);
                        setTicketStatus(ticket.status);
                        setView('chat');
                      }}
                      className="-mx-2 flex min-h-[4.5rem] w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-[#1b0d08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-semibold text-text-premium">{ticket.title}</span>
                        <span className="block text-base tabular-nums text-[#bdb7a6]">{ticket.date}</span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${
                          ticket.status === 'finalized' ? 'border-[#8b6b2e]/50 text-[#bdb7a6]' : 'border-brand-gold/70 text-brand-gold-light'
                        }`}
                      >
                        {ticket.status === 'finalized' ? 'Cerrada' : 'Abierta'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : view === 'issue' ? (
        <form onSubmit={submitIssue} className="space-y-6 pt-2">
          <fieldset>
            <legend className="mb-3 text-base font-semibold text-text-premium">Tipo de problema</legend>
            <div className="space-y-2">
              {issueCategoryOptions.map((option) => {
                const isSelected = issueCategory === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setIssueCategory(option.value)}
                    aria-pressed={isSelected}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                      isSelected ? 'border-brand-gold bg-[#0a2c20]' : 'border-[#8b6b2e]/50 hover:border-[#c5a059]'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-lg font-semibold ${isSelected ? 'text-brand-gold-light' : 'text-text-premium'}`}>{option.label}</span>
                      <span className="block text-base leading-snug text-[#bdb7a6]">{option.description}</span>
                    </span>
                    {isSelected ? <CheckCircle2 aria-hidden="true" className="h-6 w-6 shrink-0 text-brand-gold" /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {isFinancialIssue ? (
            <div className="space-y-2">
              <label htmlFor="issue-reference" className="block text-base font-semibold text-text-premium">
                Referencia del movimiento
              </label>
              <input id="issue-reference" value={issueReference} onChange={(event) => setIssueReference(event.target.value)} required className={supportField} />
              <p className="text-base text-[#bdb7a6]">La encuentras en el detalle del movimiento, en tu Billetera.</p>
            </div>
          ) : null}
          {issueCategory === 'table_error' ? (
            <div className="space-y-2">
              <label htmlFor="issue-table" className="block text-base font-semibold text-text-premium">
                Mesa
              </label>
              <input id="issue-table" value={issueTableReference} onChange={(event) => setIssueTableReference(event.target.value)} required className={supportField} />
            </div>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="issue-message" className="block text-base font-semibold text-text-premium">
              ¿Qué pasó?
            </label>
            <textarea
              id="issue-message"
              value={issueMessage}
              onChange={(event) => setIssueMessage(event.target.value)}
              required
              maxLength={5000}
              rows={5}
              className={`${supportField} h-auto resize-none py-3 leading-relaxed`}
            />
          </div>
          {issueError ? (
            <p role="alert" className="text-base font-semibold text-[#f08a7e]">
              {issueError}
            </p>
          ) : null}
          <button type="submit" disabled={isReportingIssue || !issueMessage.trim()} className={supportPrimary}>
            {isReportingIssue ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </form>
      ) : view === 'issues' ? (
        <div className="space-y-4 pt-2">
          {selectedIssue ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-text-premium">{issueCategoryLabel(selectedIssue.category)}</p>
                <IssueStatusTag status={selectedIssue.status} />
              </div>
              <p className="rounded-lg border border-[#8b6b2e]/40 bg-[#0a0a0a] p-4 text-lg leading-relaxed text-[#d9d3bf] [overflow-wrap:anywhere]">{selectedIssue.description}</p>
              <IssueAttachmentList key={`${selectedIssue.id}-${attachmentVersion}`} ticketId={selectedIssue.id} />
              <ul className="space-y-3">
                {issueMessages.map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-lg p-4 ${message.from_admin ? 'bg-[#0a2c20] shadow-[inset_0_0_0_1px_rgba(197,160,89,0.45)]' : 'bg-[#1b0d08] shadow-[inset_0_0_0_1px_rgba(139,107,46,0.4)]'}`}
                  >
                    <p className="mb-1 text-sm font-semibold text-[#c5a059]">{message.from_admin ? 'Administración' : 'Tú'}</p>
                    <p className="text-lg leading-snug text-text-premium [overflow-wrap:anywhere]">{message.message}</p>
                  </li>
                ))}
              </ul>
              {selectedIssue.status !== 'closed' && selectedIssue.status !== 'resolved' ? (
                <IssueAttachmentComposer
                  ticketId={selectedIssue.id}
                  onUploaded={() => {
                    setAttachmentVersion((version) => version + 1);
                    getPlayerIssueMessages(selectedIssue.id).then((result) => {
                      if (result.data) setIssueMessages(result.data);
                    });
                  }}
                />
              ) : null}
              {selectedIssue.status !== 'closed' && selectedIssue.status !== 'resolved' ? (
                <button
                  type="button"
                  onClick={async () => {
                    const result = await closeIssueTicket(selectedIssue.id);
                    if (!result.error) {
                      setSelectedIssue({ ...selectedIssue, status: 'closed' });
                      setIssueMessages((current) => [
                        ...current,
                        { id: crypto.randomUUID(), ticket_id: selectedIssue.id, from_admin: false, message: 'El caso fue cerrado por el jugador.', created_at: new Date().toISOString() },
                      ]);
                    }
                  }}
                  className="inline-flex min-h-12 items-center rounded-lg border border-[#e74c3c]/60 px-4 text-base font-semibold text-[#f08a7e] transition-colors hover:bg-[#2a0f0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                >
                  Cerrar caso
                </button>
              ) : null}
            </>
          ) : issues.length === 0 ? (
            <p className="py-8 text-center text-lg text-[#bdb7a6]">No tienes reclamos registrados.</p>
          ) : (
            <ul className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedIssue(issue)}
                    className="-mx-2 flex min-h-[4.5rem] w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-[#1b0d08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                  >
                    <span className="min-w-0 flex-1 text-lg font-semibold text-text-premium">{issueCategoryLabel(issue.category)}</span>
                    <IssueStatusTag status={issue.status} />
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#c5a059]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex min-h-full flex-col gap-3 py-4" role="log" aria-label="Conversación con soporte">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <MessageSquare className="mb-3 h-9 w-9 text-[#c5a059]" aria-hidden="true" />
              <p className="font-display text-[1.5rem] font-bold text-text-premium">¿En qué te ayudamos?</p>
              <p className="mt-2 max-w-[32ch] text-base text-[#bdb7a6]">Escribe tu consulta y el equipo del club te responderá por aquí.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.sender === 'Tú';
              return (
                <div key={msg.id} className={`flex max-w-[85%] flex-col ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
                  <span className="mb-1 px-1 text-sm text-[#bdb7a6]">
                    {mine ? 'Tú' : msg.sender} · <span className="tabular-nums">{msg.time}</span>
                  </span>
                  <div
                    className={`rounded-xl px-4 py-2.5 text-lg leading-snug text-text-premium [overflow-wrap:anywhere] ${
                      mine ? 'rounded-tr-sm bg-[#0a2c20] shadow-[inset_0_0_0_1px_rgba(197,160,89,0.45)]' : 'rounded-tl-sm bg-[#1b0d08] shadow-[inset_0_0_0_1px_rgba(139,107,46,0.4)]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </PlayerSheet>
  );
}

const supportPrimary =
  'inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-gold px-6 text-lg font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-60';
const supportRow =
  'flex min-h-[4.5rem] w-full items-center gap-4 rounded-lg border border-[#8b6b2e]/60 px-4 py-3 text-left transition-colors hover:border-brand-gold hover:bg-[#1b0d08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light';
const supportField =
  'h-14 w-full rounded-lg border border-[#8b6b2e]/70 bg-[#0a0a0a] px-4 text-lg text-text-premium caret-brand-gold outline-none transition-colors focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/35';

const ISSUE_STATUS: Record<string, { label: string; className: string }> = {
  open: { label: 'Abierto', className: 'border-brand-gold/70 text-brand-gold-light' },
  investigating: { label: 'En revisión', className: 'border-[#c5a059]/60 text-brand-gold-light' },
  resolved: { label: 'Resuelto', className: 'border-[#2ecc71]/45 text-[#7fe0a6]' },
  closed: { label: 'Cerrado', className: 'border-[#8b6b2e]/50 text-[#bdb7a6]' },
};

function IssueStatusTag({ status }: { status: string }) {
  const look = ISSUE_STATUS[status] ?? { label: status, className: 'border-[#8b6b2e]/50 text-[#bdb7a6]' };
  return <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${look.className}`}>{look.label}</span>;
}

function issueCategoryLabel(category: string) {
  return issueCategoryOptions.find((option) => option.value === category)?.label ?? category.replaceAll('_', ' ');
}
