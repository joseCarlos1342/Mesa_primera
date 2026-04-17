'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Clock, User, MessageCircle, CheckCircle2, History, Inbox, X } from 'lucide-react';
import { SupportChat } from '@/components/SupportChat';
import { getAvatarSvg } from '@/utils/avatars';
import { closeSupportTicket, type SupportTicket, type SupportTicketStatus } from '@/app/actions/support';

type TicketWithUser = SupportTicket & {
  user: { username: string; full_name: string; avatar_url: string | null };
  /** Derived: new messages from player that admin hasn't seen */
  awaitingResponse?: boolean;
};

type TicketFilter = 'pending' | 'attended' | 'finalized';

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  pending: 'Pendiente',
  attended: 'Atendido',
  finalized: 'Finalizado',
};

const STATUS_STYLES: Record<SupportTicketStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  attended: 'bg-indigo-500/20 text-indigo-400',
  finalized: 'bg-emerald-500/20 text-emerald-400',
};

export function SupportConversationList({ initialTickets, adminId: _adminId }: { initialTickets: TicketWithUser[]; adminId: string }) {
  const [tickets, setTickets] = useState<TicketWithUser[]>(
    initialTickets.map(t => ({
      ...t,
      awaitingResponse: t.status !== 'finalized' && t.last_message_from === 'player',
    }))
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TicketFilter>('pending');
  const [isClosing, setIsClosing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
      || (typeof window !== 'undefined' && (window as any).__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_SOCKET_URL)
      || 'http://localhost:2568';
    const s = io(`${socketUrl}/support`, { withCredentials: true });
    setSocket(s);

    // New ticket created by a player
    s.on('support:ticket-created', (data: { ticketId: string; userId: string; username: string; preview: string }) => {
      setTickets(prev => {
        if (prev.some(t => t.id === data.ticketId)) return prev;
        const newTicket: TicketWithUser = {
          id: data.ticketId,
          user_id: data.userId,
          status: 'pending',
          closed_at: null,
          closed_by: null,
          closed_by_role: null,
          last_message_at: new Date().toISOString(),
          last_message_from: 'player',
          last_message_preview: data.preview,
          message_count: 1,
          attachment_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: { username: data.username, full_name: data.username, avatar_url: null },
          awaitingResponse: true,
        };
        playNotification();
        return [newTicket, ...prev];
      });
    });

    // New message in a ticket
    s.on('support:message-created', (data: { ticketId: string; message: string; from: 'player' | 'admin'; timestamp: string }) => {
      setTickets(prev => prev.map(t => {
        if (t.id !== data.ticketId) return t;
        // CRITICAL: Never change status of finalized tickets
        if (t.status === 'finalized') return t;
        const updated = {
          ...t,
          last_message_at: data.timestamp,
          last_message_from: data.from,
          last_message_preview: data.message.slice(0, 100),
          message_count: t.message_count + 1,
          updated_at: data.timestamp,
          awaitingResponse: data.from === 'player',
        };
        if (data.from === 'player') playNotification();
        return updated;
      }));
    });

    // Ticket status changed to attended
    s.on('support:ticket-attended', (data: { ticketId: string }) => {
      setTickets(prev => prev.map(t =>
        t.id === data.ticketId && t.status === 'pending'
          ? { ...t, status: 'attended' as const }
          : t
      ));
    });

    // Ticket finalized
    s.on('support:ticket-finalized', (data: { ticketId: string; closedByRole: 'player' | 'admin' }) => {
      setTickets(prev => prev.map(t =>
        t.id === data.ticketId
          ? { ...t, status: 'finalized' as const, closed_at: new Date().toISOString(), closed_by_role: data.closedByRole, awaitingResponse: false }
          : t
      ));
    });

    // Legacy compatibility: handle old-style incoming messages  
    s.on('support:incoming', (data: any) => {
      const ticketId = data.ticketId || data.userId;
      setTickets(prev => {
        const existing = prev.find(t => t.id === ticketId);
        // CRITICAL FIX: never reset finalized tickets
        if (existing?.status === 'finalized') return prev;
        if (existing) {
          return prev.map(t =>
            t.id === ticketId
              ? { ...t, last_message_preview: data.message, last_message_at: new Date().toISOString(), last_message_from: 'player' as const, awaitingResponse: true }
              : t
          );
        }
        // Truly new — add as pending
        const newTicket: TicketWithUser = {
          id: ticketId,
          user_id: data.userId,
          status: 'pending',
          closed_at: null, closed_by: null, closed_by_role: null,
          last_message_at: new Date().toISOString(),
          last_message_from: 'player',
          last_message_preview: data.message,
          message_count: 1, attachment_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: { username: 'Nuevo', full_name: 'Usuario', avatar_url: null },
          awaitingResponse: true,
        };
        playNotification();
        return [newTicket, ...prev];
      });
    });

    return () => { s.disconnect(); };
  }, []);

  const handleClose = useCallback(async (ticketId: string) => {
    setIsClosing(true);
    try {
      const result = await closeSupportTicket(ticketId);
      if (result.error) {
        console.error('Error closing ticket:', result.error);
        return;
      }
      setTickets(prev => prev.map(t =>
        t.id === ticketId
          ? { ...t, status: 'finalized' as const, closed_at: new Date().toISOString(), closed_by_role: 'admin', awaitingResponse: false }
          : t
      ));
      socket?.emit('support:ticket-finalized', { ticketId, closedByRole: 'admin' });
      setSelectedTicketId(null);
    } finally {
      setIsClosing(false);
    }
  }, [socket]);

  const filteredTickets = tickets.filter(t => t.status === filter);
  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[75vh] min-h-155">
      {/* Tickets List */}
      <div className={`w-full lg:w-96 flex flex-col gap-4 overflow-hidden ${selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center justify-center px-2 shrink-0 lg:justify-between">
          <h3 className="hidden text-[10px] font-black text-slate-500 uppercase tracking-widest lg:block">Canales de Soporte</h3>
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${filter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  PENDIENTES
                </button>
                <button 
                  onClick={() => setFilter('attended')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${filter === 'attended' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  ATENDIDOS
                </button>
                <button 
                  onClick={() => setFilter('finalized')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${filter === 'finalized' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  FINALIZADOS
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {filteredTickets.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicketId(ticket.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                selectedTicketId === ticket.id 
                  ? 'bg-indigo-600 border-indigo-500 shadow-lg' 
                  : ticket.awaitingResponse 
                    ? 'bg-indigo-500/10 border-indigo-500/30' 
                    : 'bg-slate-900/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-colors overflow-hidden border border-brand-gold/20 ${
                       selectedTicketId === ticket.id ? 'bg-white text-indigo-600' : 'bg-slate-800'
                  }`}>
                    {ticket.user?.avatar_url && getAvatarSvg(ticket.user.avatar_url) ? (
                      <div className="w-full h-full scale-[1.2]">
                        {getAvatarSvg(ticket.user.avatar_url)}
                      </div>
                    ) : (
                      <span className={selectedTicketId === ticket.id ? 'text-indigo-600' : 'text-white'}>
                        {ticket.user?.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-sm font-black uppercase truncate tracking-tight ${selectedTicketId === ticket.id ? 'text-white' : 'text-slate-200'}`}>
                        {ticket.user?.full_name || ticket.user?.username || 'Usuario'}
                    </p>
                    <p className={`text-[9px] font-mono leading-none mt-1 ${selectedTicketId === ticket.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                        Ticket: {ticket.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                {ticket.awaitingResponse && (
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1" />
                )}
              </div>
              <p className={`text-xs italic line-clamp-1 font-medium ${selectedTicketId === ticket.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                &ldquo;{ticket.last_message_preview}&rdquo;
              </p>
              <div className="flex justify-between items-center mt-3">
                <p className={`text-[9px] flex items-center gap-1 font-black uppercase tracking-widest ${selectedTicketId === ticket.id ? 'text-indigo-200' : 'text-slate-600'}`}>
                  <Clock className="w-3 h-3" /> {new Date(ticket.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${STATUS_STYLES[ticket.status]}`}>
                    {STATUS_LABELS[ticket.status]}
                </div>
              </div>
            </div>
          ))}

          {filteredTickets.length === 0 && (
            <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-white/5 text-slate-600 italic text-xs flex flex-col items-center gap-4">
               {filter === 'finalized' ? <History className="w-8 h-8 opacity-10" /> : <Inbox className="w-8 h-8 opacity-10" />}
               <span>No hay {filter === 'pending' ? 'tickets pendientes' : filter === 'attended' ? 'tickets atendidos' : 'historial'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className={`flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative ${!selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
        {selectedTicketId && activeTicket ? (
          <div className="flex flex-col w-full h-full min-h-0 bg-slate-950/20">
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-slate-950/40 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-600/20 shrink-0 overflow-hidden">
                        {activeTicket.user?.avatar_url && getAvatarSvg(activeTicket.user.avatar_url) ? (
                          <div className="w-full h-full scale-[1.2]">
                            {getAvatarSvg(activeTicket.user.avatar_url)}
                          </div>
                        ) : (
                          <User className="w-6 h-6 text-indigo-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-white uppercase tracking-tight italic truncate">
                            {activeTicket.user?.full_name || 'Chat Principal'}
                        </h3>
                        <p className="text-[9px] font-black tracking-widest uppercase flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${activeTicket.status === 'finalized' ? 'bg-slate-500' : 'bg-emerald-400 animate-pulse'}`} />
                            <span className={activeTicket.status === 'finalized' ? 'text-slate-500' : 'text-emerald-400'}>
                              Sesión #{activeTicket.id.slice(0, 8)} · {STATUS_LABELS[activeTicket.status]}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {activeTicket.status !== 'finalized' && (
                      <button 
                          onClick={() => handleClose(selectedTicketId)}
                          disabled={isClosing}
                          className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                      >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          FINALIZAR CHAT
                      </button>
                    )}
                    {activeTicket.status === 'finalized' && (
                      <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          FINALIZADO
                      </div>
                    )}
                    <button 
                        onClick={() => setSelectedTicketId(null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                        title="Cerrar vista"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 min-h-0 relative">
                <SupportChat 
                    userId={activeTicket.user_id} 
                    isAdmin={true} 
                    embedded={true}
                    ticketId={selectedTicketId}
                    key={selectedTicketId}
                />
            </div>
            
            {/* Mobile Close Button */}
            <div className="md:hidden p-4 border-t border-white/5 bg-slate-900/60 shrink-0">
                {activeTicket.status !== 'finalized' ? (
                  <button 
                    onClick={() => handleClose(selectedTicketId)}
                    disabled={isClosing}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    FINALIZAR CHAT
                  </button>
                ) : (
                  <div className="w-full py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    CHAT FINALIZADO
                  </div>
                )}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center items-center text-center space-y-6">
             <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/5 flex items-center justify-center border border-indigo-500/10">
                <MessageCircle className="w-10 h-10 text-indigo-600/30" />
             </div>
             <div className="max-w-xs space-y-2">
                <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Centro de Comando</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                   Canal de comunicación directa con los jugadores.
                </p>
             </div>
             <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-amber-400 font-black text-lg italic">{tickets.filter(t => t.status === 'pending').length}</p>
                    <p className="text-[8px] font-black uppercase text-slate-500 mt-1 tracking-widest">Pendientes</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-indigo-400 font-black text-lg italic">{tickets.filter(t => t.status === 'attended').length}</p>
                    <p className="text-[8px] font-black uppercase text-slate-500 mt-1 tracking-widest">Atendidos</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-emerald-400 font-black text-lg italic">{tickets.filter(t => t.status === 'finalized').length}</p>
                    <p className="text-[8px] font-black uppercase text-slate-500 mt-1 tracking-widest">Finalizados</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function playNotification() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch { /* audio play not critical */ }
}
