"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X, Loader2, User, ChevronLeft, MessageCircle } from "lucide-react";
import { sendDirectMessage, getDirectMessages } from "@/app/actions/social-actions";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { getAvatarSvg } from "@/utils/avatars";

interface DirectChatProps {
  friend: any;
  onClose: () => void;
}

export function DirectChat({ friend, onClose }: DirectChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchSession();

    const fetchMessages = async () => {
      setLoading(true);
      const data = await getDirectMessages(friend.profile.id);
      setMessages(data);
      setLoading(false);
    };

    fetchMessages();

    // REAL-TIME SUBSCRIPTION
    const channel = supabase
      .channel(`chat-${friend.profile.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages'
      }, (payload) => {
        // Only add if it's relevant to this chat
        const msg = payload.new;
        if ((msg.sender_id === friend.profile.id) || (msg.receiver_id === friend.profile.id)) {
            setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friend.profile.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage;
    setNewMessage(""); // Optimistic clear
    
    const res = await sendDirectMessage(friend.profile.id, content);
    if (res.error) {
       // Maybe handle error
       console.error(res.error);
    }
    setSending(false);
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950 border-l border-white/5 z-[150] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)]"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between relative shadow-xl z-20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-brand-gold transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-12 h-12 bg-slate-950 rounded-[1.2rem] flex items-center justify-center border border-brand-gold/30 overflow-hidden relative shadow-2xl">
            {friend.profile.avatar_url && getAvatarSvg(friend.profile.avatar_url) ? (
              <div className="w-full h-full scale-[1.3]">
                {getAvatarSvg(friend.profile.avatar_url)}
              </div>
            ) : (
              <User className="w-6 h-6 text-slate-600" />
            )}
          </div>
          <div className="flex flex-col">
            <h3 className="font-display font-black italic uppercase text-lg text-white leading-none tracking-tight">
              {friend.nickname || friend.profile.username}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${friend.status === 'online' ? 'bg-emerald-500 animate-pulse' : friend.status === 'in-game' ? 'bg-brand-gold' : 'bg-slate-600'}`} />
              <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${friend.status === 'online' ? 'text-emerald-500' : friend.status === 'in-game' ? 'text-brand-gold' : 'text-slate-500'}`}>
                {friend.status === 'online' ? 'En Línea' : friend.status === 'in-game' ? 'En Partida' : 'Desconectado'}
              </p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="hidden sm:block p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-brand-red">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-slate-950 to-slate-900/40"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-brand-gold" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Abriendo canal seguro...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
            <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-dashed border-white/10">
              <MessageCircle className="w-8 h-8 text-brand-gold" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-display font-black italic uppercase tracking-widest text-white [word-spacing:0.3em]">Inicia&nbsp; la&nbsp; conversación</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Escribe un mensaje para empezar a chatear.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = currentUserId ? msg.sender_id === currentUserId : msg.sender_id !== friend.profile.id;
            return (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-brand-gold/20 flex-shrink-0 overflow-hidden scale-[1.1]">
                    {getAvatarSvg(friend.profile.avatar_url)}
                  </div>
                )}
                <div className={`max-w-[80%] relative group ${
                  isMe 
                    ? 'bg-brand-gold text-black rounded-2xl rounded-br-none px-4 py-3 shadow-[0_4px_12px_rgba(226,176,68,0.15)]' 
                    : 'bg-slate-800/80 text-white border border-white/5 rounded-2xl rounded-bl-none px-4 py-3'
                }`}>
                  <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                  <p className={`text-[8px] mt-1 font-black uppercase opacity-40 ${isMe ? 'text-black' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-6 pb-10 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="relative group">
          <input
            type="text"
            placeholder="Mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/5 rounded-[1.5rem] py-4 pl-6 pr-14 text-sm text-white focus:outline-none focus:border-brand-gold/40 focus:bg-slate-900 transition-all placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="absolute right-2 top-2 p-3 bg-brand-gold text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-brand-gold/10"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
