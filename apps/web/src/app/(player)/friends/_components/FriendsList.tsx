"use client";

import { useState } from "react";
import { MessageCircle, Gamepad2, UserX, Edit2, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { getAvatarSvg } from "@/utils/avatars";
import { inviteToPlay, updateFriendNickname } from "@/app/actions/social-actions";
import { ToastType } from "@/components/ui/Toast";

interface Friend {
  friendshipId: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    level: number;
  };
  status?: 'online' | 'offline' | 'in-game';
  nickname?: string;
}

interface FriendsListProps {
  friends: Friend[];
  onChat: (friend: Friend) => void;
  onRemove: (friendshipId: string) => void;
  onAction: (message: string, type: ToastType) => void;
  onRefresh: () => void;
}

export function FriendsList({ friends, onChat, onRemove, onAction, onRefresh }: FriendsListProps) {
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [newNickname, setNewNickname] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);

  const handleUpdateNickname = async (friendshipId: string) => {
    const res = await updateFriendNickname(friendshipId, newNickname);
    if (res.success) {
      onAction("Apodo actualizado", "success");
      onRefresh();
      setEditingNickname(null);
    } else {
      onAction("Error al actualizar apodo", "error");
    }
  };

  const handleInvite = async (friendId: string) => {
    setInviting(friendId);
    const res = await inviteToPlay(friendId);
    if (res.success) {
      onAction("¡Invitación enviada!", "success");
    } else {
      onAction("Error al enviar invitación", "error");
    }
    setInviting(null);
  };

  if (!friends || friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 bg-white/5 border border-dashed border-white/10 rounded-[3rem] opacity-30">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-slate-500" />
        </div>
        <p className="font-display font-black italic uppercase tracking-[0.2em] text-sm text-slate-400">Tu círculo está vacío</p>
        <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest font-bold">¡Busca nuevos jugadores abajo!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {friends.map((friend, i) => (
        <motion.div
          key={friend.friendshipId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group relative bg-slate-950/40 backdrop-blur-md border border-white/5 p-6 rounded-[2.5rem] hover:bg-slate-900/60 hover:border-brand-gold/20 transition-all duration-500 shadow-xl overflow-hidden"
        >
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-brand-gold/10 transition-colors" />

          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[1.5rem] flex items-center justify-center border-2 border-white/5 group-hover:border-brand-gold/40 shadow-2xl overflow-hidden relative transition-colors duration-500">
                  {friend.profile.avatar_url && getAvatarSvg(friend.profile.avatar_url) ? (
                    <div className="w-full h-full scale-[1.3]">
                      {getAvatarSvg(friend.profile.avatar_url)}
                    </div>
                  ) : (
                    <span className="text-2xl font-display font-black text-brand-gold italic">
                      {friend.profile.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-slate-950 rounded-full shadow-lg ${
                  friend.status === 'online' ? 'bg-emerald-500 box-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                  friend.status === 'in-game' ? 'bg-brand-gold shadow-[0_0_10px_rgba(226,176,68,0.5)]' : 
                  'bg-slate-700'
                }`} />
              </div>
              
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {editingNickname === friend.friendshipId ? (
                    <div className="flex items-center gap-1 bg-black/60 p-2 rounded-xl border border-brand-gold/30 shadow-inner">
                      <input 
                        autoFocus
                        type="text"
                        value={newNickname}
                        onChange={(e) => setNewNickname(e.target.value)}
                        className="w-28 bg-transparent text-xs font-black text-brand-gold uppercase tracking-tight focus:outline-none"
                      />
                      <button onClick={() => handleUpdateNickname(friend.friendshipId)} className="p-1 hover:text-emerald-500 text-brand-gold/60 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingNickname(null)} className="p-1 hover:text-red-500 text-slate-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-display font-black italic uppercase text-lg text-text-premium truncate group-hover:text-brand-gold transition-colors leading-none pt-1">
                        {friend.nickname || friend.profile.username}
                      </h4>
                      {friend.nickname && (
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-40">
                          {friend.profile.username.startsWith('@') ? '' : '@'}{friend.profile.username}
                        </span>
                      )}
                      <button 
                        onClick={() => {
                          setEditingNickname(friend.friendshipId);
                          setNewNickname(friend.nickname || "");
                        }}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 bg-white/5 rounded-lg text-slate-500 hover:text-brand-gold hover:bg-white/10 transition-all ml-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                    friend.status === 'online' ? 'text-emerald-500/80' : 
                    friend.status === 'in-game' ? 'text-brand-gold/80' : 
                    'text-slate-600'
                  }`}>
                    {friend.status === 'online' ? 'En Línea' : 
                     friend.status === 'in-game' ? 'En Partida' : 
                     'Desconectado'}
                  </p>
                  </div>
                </div>
              </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => onChat(friend)}
                className="flex flex-col items-center justify-center py-4 bg-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 border border-transparent transition-all gap-1 active:scale-95 shadow-lg group/btn"
                title="Escribir"
              >
                <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-60 transition-opacity">Chat</span>
              </button>
              <button 
                onClick={() => handleInvite(friend.profile.id)}
                disabled={inviting === friend.profile.id}
                className={`flex flex-col items-center justify-center py-4 bg-brand-gold/10 rounded-2xl text-brand-gold hover:bg-brand-gold hover:text-black border border-brand-gold/20 transition-all gap-1 active:scale-95 shadow-lg group/btn ${inviting === friend.profile.id ? 'animate-pulse opacity-50 shadow-none' : ''}`}
                title="Invitar a jugar"
              >
                <Gamepad2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-60 transition-opacity">Invitar</span>
              </button>
              <button 
                onClick={() => onRemove(friend.friendshipId)}
                className="flex flex-col items-center justify-center py-4 bg-red-500/5 rounded-2xl text-red-500/40 hover:text-white hover:bg-red-500 border border-transparent transition-all gap-1 active:scale-95 shadow-lg group/btn"
                title="Borrar amigo"
              >
                <UserX className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-60 transition-opacity">Borrar</span>
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
