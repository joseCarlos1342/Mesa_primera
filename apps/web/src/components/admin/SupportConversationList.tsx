'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Clock, User, MessageCircle, CheckCircle2, History, Inbox, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { SupportChat } from '@/components/SupportChat';
import { getAvatarSvg } from '@/utils/avatars';

interface Conversation {
  userId: string;
  ticketId: string;
  latestMessage: any;
  messages: any[];
  user: any;
  pending: boolean;
  isResolved?: boolean;
}

export function SupportConversationList({ initialConversations, adminId }: { initialConversations: Conversation[], adminId: string }) {
  // Map initial conversations to ensure isResolved is set from latest message
  // Also ensures ticketId is tracked.
  const [conversations, setConversations] = useState<Conversation[]>(
    initialConversations.map(c => ({ 
      ...c, 
      isResolved: !!c.latestMessage.is_resolved,
      ticketId: c.latestMessage.ticket_id || c.userId 
    }))
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'resolved'>('active');
  const [isResolving, setIsResolving] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:2568';
    const s = io(`${socketUrl}/support`, { withCredentials: true });
    setSocket(s);

    s.on('support:incoming', async (data) => {
      setConversations(prev => {
        const ticketId = data.ticketId || data.userId;
        const index = prev.findIndex(c => c.ticketId === ticketId);
        const now = new Date().toISOString();
        
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            latestMessage: { ...updated[index].latestMessage, message: data.message, created_at: now, is_resolved: false },
            pending: true,
            isResolved: false
          };
          
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}

          return [updated[index], ...updated.filter((_, i) => i !== index)];
        } else {
          // New conversation entry for new ticket
          const newConv: Conversation = {
            userId: data.userId,
            ticketId: ticketId,
            latestMessage: { message: data.message, created_at: now, from_admin: false, is_resolved: false, ticket_id: ticketId },
            messages: [],
            user: { username: 'Nuevo', full_name: 'Usuario' },
            pending: true,
            isResolved: false
          };

          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}

          return [newConv, ...prev];
        }
      });
    });

    return () => { s.disconnect(); };
  }, []);

  const handleResolve = async (ticketId: string) => {
    setIsResolving(true);
    try {
      // Mark specific ticket as resolved
      const { error } = await supabase
        .from('support_messages')
        .update({ is_resolved: true })
        .eq('ticket_id', ticketId);

      if (error) throw error;

      const conversation = conversations.find(c => c.ticketId === ticketId);
      if (socket && conversation) {
        socket.emit('support:resolve', { userId: conversation.userId, ticketId });
      }

      setConversations(prev => prev.map(c => 
        c.ticketId === ticketId ? { ...c, isResolved: true, pending: false } : c
      ));
      setSelectedTicketId(null);
    } catch (err) {
      console.error('Error resolving ticket:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const filteredConversations = conversations.filter(c => filter === 'resolved' ? c.isResolved : !c.isResolved);
  const activeConversation = conversations.find(c => c.ticketId === selectedTicketId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[75vh] min-h-[620px]">
      {/* Conversations List */}
      <div className={`w-full lg:w-96 flex flex-col gap-4 overflow-hidden ${selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center justify-between px-2 shrink-0">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Canales de Soporte</h3>
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${filter === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  PENDIENTES
                </button>
                <button 
                  onClick={() => setFilter('resolved')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${filter === 'resolved' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  RESUELTOS
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {filteredConversations.map((conv) => (
            <div 
              key={conv.ticketId} 
              onClick={() => {
                setSelectedTicketId(conv.ticketId);
                setConversations(prev => prev.map(c => 
                    c.ticketId === conv.ticketId ? { ...c, pending: false } : c
                ));
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                selectedTicketId === conv.ticketId 
                  ? 'bg-indigo-600 border-indigo-500 shadow-lg' 
                  : conv.pending 
                    ? 'bg-indigo-500/10 border-indigo-500/30' 
                    : 'bg-slate-900/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-colors overflow-hidden border border-brand-gold/20 ${
                       selectedTicketId === conv.ticketId ? 'bg-white text-indigo-600' : 'bg-slate-800'
                  }`}>
                    {conv.user?.avatar_url && getAvatarSvg(conv.user.avatar_url) ? (
                      <div className="w-full h-full scale-[1.2]">
                        {getAvatarSvg(conv.user.avatar_url)}
                      </div>
                    ) : (
                      <span className={selectedTicketId === conv.ticketId ? 'text-indigo-600' : 'text-white'}>
                        {conv.user?.username?.[0].toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-sm font-black uppercase truncate tracking-tight ${selectedTicketId === conv.ticketId ? 'text-white' : 'text-slate-200'}`}>
                        {conv.user?.full_name || conv.user?.username || 'Usuario'}
                    </p>
                    <p className={`text-[9px] font-mono leading-none mt-1 ${selectedTicketId === conv.ticketId ? 'text-indigo-200' : 'text-slate-500'}`}>
                        Ticket: {conv.ticketId.slice(0, 8)}
                    </p>
                  </div>
                </div>
                {conv.pending && (
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1" />
                )}
              </div>
              <p className={`text-xs italic line-clamp-1 font-medium ${selectedTicketId === conv.ticketId ? 'text-indigo-100' : 'text-slate-400'}`}>
                "{conv.latestMessage.message}"
              </p>
              <div className="flex justify-between items-center mt-3">
                <p className={`text-[9px] flex items-center gap-1 font-black uppercase tracking-widest ${selectedTicketId === conv.ticketId ? 'text-indigo-200' : 'text-slate-600'}`}>
                  <Clock className="w-3 h-3" /> {new Date(conv.latestMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                    conv.isResolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500 text-white'
                }`}>
                    {conv.isResolved ? 'Resuelto' : 'Pendiente'}
                </div>
              </div>
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-white/5 text-slate-600 italic text-xs flex flex-col items-center gap-4">
               {filter === 'active' ? <Inbox className="w-8 h-8 opacity-10" /> : <History className="w-8 h-8 opacity-10" />}
               <span>No hay {filter === 'active' ? 'mensajes activos' : 'historial'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className={`flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative ${!selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
        {selectedTicketId && activeConversation ? (
          <div className="flex flex-col w-full h-full min-h-0 bg-slate-950/20">
            {/* Header: Fixed Height, non-shrinking */}
            <div className="p-5 border-b border-white/5 bg-slate-950/40 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-600/20 shrink-0 overflow-hidden">
                        {activeConversation.user?.avatar_url && getAvatarSvg(activeConversation.user.avatar_url) ? (
                          <div className="w-full h-full scale-[1.2]">
                            {getAvatarSvg(activeConversation.user.avatar_url)}
                          </div>
                        ) : (
                          <User className="w-6 h-6 text-indigo-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-white uppercase tracking-tight italic truncate">
                            {activeConversation.user?.full_name || 'Chat Principal'}
                        </h3>
                        <p className="text-[9px] font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Sesión #{activeConversation.ticketId.slice(0, 8)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={() => handleResolve(selectedTicketId)}
                        disabled={isResolving || activeConversation.isResolved}
                        className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            activeConversation.isResolved
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-none' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {activeConversation.isResolved ? 'FINALIZADO' : 'CERRAR CHAT'}
                    </button>
                    <button 
                        onClick={() => setSelectedTicketId(null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                        title="Cerrar vista"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {/* The Chat Area: Flex-Grow, allows internal scroll */}
            <div className="flex-1 min-h-0 relative">
                <SupportChat 
                    userId={activeConversation.userId} 
                    isAdmin={true} 
                    embedded={true}
                    ticketId={selectedTicketId}
                    key={selectedTicketId} // Force remount for ticket switch
                />
            </div>
            
            {/* Mobile Close Button (Bottom sticky) */}
            <div className="md:hidden p-4 border-t border-white/5 bg-slate-900/60 shrink-0">
                {!activeConversation.isResolved && (
                  <button 
                    onClick={() => handleResolve(selectedTicketId)}
                    disabled={isResolving}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    DAR POR RESUELTO Y CERRAR
                  </button>
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
             <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-indigo-400 font-black text-lg italic">{conversations.filter(c => !c.isResolved && c.pending).length}</p>
                    <p className="text-[8px] font-black uppercase text-slate-500 mt-1 tracking-widest">Tickets</p>
                </div>
                <div className={`p-4 rounded-2xl bg-white/5 border border-white/5`}>
                    <p className="text-emerald-400 font-black text-lg italic">{conversations.filter(c => !c.isResolved).length}</p>
                    <p className="text-[8px] font-black uppercase text-slate-500 mt-1 tracking-widest">Activos</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
