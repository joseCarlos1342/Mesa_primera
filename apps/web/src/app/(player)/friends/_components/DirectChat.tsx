"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send } from "lucide-react";
import { sendDirectMessage, getDirectMessages } from "@/app/actions/social-actions";
import { createClient } from "@/utils/supabase/client";
import { PlayerSheet } from "@/components/player/PlayerSheet";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { Skeleton } from "@/components/player/PlayerUI";
import { presenceOf, type Friend } from "./FriendsList";

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface DirectChatProps {
  friend: Friend;
  onClose: () => void;
}

const timeFormat = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

/** Chat directo: pantalla completa en móvil, panel lateral desde `sm`. */
export function DirectChat({ friend, onClose }: DirectChatProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchSession();

    const fetchMessages = async () => {
      setLoading(true);
      const data = (await getDirectMessages(friend.profile.id)) as DirectMessage[];
      setMessages(data);
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${friend.profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload: { new: DirectMessage }) => {
          const msg = payload.new;
          if (msg.sender_id === friend.profile.id || msg.receiver_id === friend.profile.id) {
            setMessages((prev) => [...prev, msg]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friend.profile.id, supabase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setSendError(null);
    const content = newMessage;
    setNewMessage("");

    const res = await sendDirectMessage(friend.profile.id, content);
    if (res.error) {
      setNewMessage(content);
      setSendError("No se pudo enviar el mensaje. Inténtalo de nuevo.");
    }
    setSending(false);
  };

  const name = friend.nickname || friend.profile.username;
  const presence = presenceOf(friend.status);

  return (
    <PlayerSheet
      open
      variant="full"
      onClose={onClose}
      closeLabel="Cerrar chat"
      title={name}
      description={<span className={presence.text}>{presence.label}</span>}
      headerStart={<PlayerAvatar avatar={friend.profile.avatar_url} name={friend.profile.username} size={48} />}
      footer={
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <label htmlFor="direct-message" className="sr-only">
            Mensaje para {name}
          </label>
          <input
            id="direct-message"
            type="text"
            placeholder="Escribe un mensaje…"
            value={newMessage}
            data-autofocus
            onChange={(e) => setNewMessage(e.target.value)}
            className="h-14 min-w-0 flex-1 rounded-lg border border-[#8b6b2e]/70 bg-[#0a0a0a] px-4 text-lg text-text-premium caret-brand-gold outline-none transition-colors placeholder:text-[#8a8478] focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/35"
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            disabled={!newMessage.trim() || sending}
            aria-busy={sending || undefined}
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-gold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-50"
          >
            <Send className="h-6 w-6" aria-hidden="true" />
          </button>
        </form>
      }
    >
      <div ref={scrollRef} className="-mx-5 h-full overflow-y-auto px-5 py-4 sm:-mx-7 sm:px-7" role="log" aria-label={`Conversación con ${name}`}>
        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="ml-auto h-14 w-1/2" />
            <Skeleton className="h-14 w-3/5" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="mb-3 h-9 w-9 text-[#c5a059]" aria-hidden="true" />
            <p className="font-display text-[1.375rem] font-bold text-text-premium">Inicia la conversación</p>
            <p className="mt-1 text-base text-[#bdb7a6]">Escribe un mensaje para empezar a chatear.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => {
              const isMe = currentUserId ? msg.sender_id === currentUserId : msg.sender_id !== friend.profile.id;
              return (
                <li key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-xl px-4 py-2.5 ${
                      isMe ? "rounded-br-sm bg-[#0a2c20] shadow-[inset_0_0_0_1px_rgba(197,160,89,0.45)]" : "rounded-bl-sm bg-[#1b0d08] shadow-[inset_0_0_0_1px_rgba(139,107,46,0.4)]"
                    }`}
                  >
                    <p className="text-lg leading-snug text-text-premium [overflow-wrap:anywhere]">{msg.content}</p>
                    <p className="mt-1 text-right text-sm tabular-nums text-[#bdb7a6]">{timeFormat.format(new Date(msg.created_at))}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {sendError && (
          <p role="alert" className="mt-3 text-base font-semibold text-[#f08a7e]">
            {sendError}
          </p>
        )}
      </div>
    </PlayerSheet>
  );
}
