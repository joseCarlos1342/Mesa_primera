"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X, Loader2, User, ChevronLeft } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
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
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950 border-l border-white/5 z-[110] flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="sm:hidden p-2 -ml-2 text-slate-400">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-brand-gold/30 overflow-hidden relative">
            {friend.profile.avatar_url && getAvatarSvg(friend.profile.avatar_url) ? (
              <div className="w-full h-full scale-[1.2]">
                {getAvatarSvg(friend.profile.avatar_url)}
              </div>
            ) : (
              <User className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <div>
            <p className="font-display font-black italic uppercase text-sm text-white tracking-tight">{friend.profile.username}</p>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">En Línea</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full opacity-20">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-20">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <User className="w-6 h-6" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">Inicia la conversación</p>
            <p className="text-[10px]">Escribe un mensaje para empezar a chatear.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id !== friend.profile.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  isMe 
                    ? 'bg-brand-gold text-black rounded-tr-none font-medium shadow-lg shadow-brand-gold/5' 
                    : 'bg-white/5 text-white border border-white/5 rounded-tl-none'
                }`}>
                  {msg.content}
                  <p className={`text-[8px] mt-1 opacity-40 ${isMe ? 'text-black' : 'text-slate-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5 bg-slate-900/30">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white focus:outline-none focus:border-brand-gold/30 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-brand-gold text-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
