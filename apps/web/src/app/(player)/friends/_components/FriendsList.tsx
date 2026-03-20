"use client";

import { useState } from "react";
import { MessageCircle, Gamepad2, UserX, Edit2, Check, X, ShieldCheck } from "lucide-react";
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
          className="group relative bg-slate-900/40 border border-white/5 p-4 rounded-[1.8rem] hover:bg-slate-900 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center border border-brand-gold/30 shadow-2xl overflow-hidden relative">
                {friend.profile.avatar_url && getAvatarSvg(friend.profile.avatar_url) ? (
                  <div className="w-full h-full scale-[1.2]">
                    {getAvatarSvg(friend.profile.avatar_url)}
                  </div>
                ) : (
                  <span className="text-xl font-black text-slate-400 italic uppercase">
                    {friend.profile.username.charAt(0)}
                  </span>
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-4 border-slate-950 rounded-full ${
                friend.status === 'online' ? 'bg-emerald-500' : 
                friend.status === 'in-game' ? 'bg-brand-gold shadow-[0_0_8px_rgba(255,200,80,0.5)]' : 
                'bg-slate-700'
              }`} />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {editingNickname === friend.friendshipId ? (
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-brand-gold/30">
                    <input 
                      autoFocus
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="w-24 bg-transparent text-xs font-black text-brand-gold uppercase tracking-tight focus:outline-none"
                    />
                    <button onClick={() => handleUpdateNickname(friend.friendshipId)} className="p-1 hover:text-emerald-500 text-slate-400">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingNickname(null)} className="p-1 hover:text-red-500 text-slate-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="font-display font-black italic uppercase text-sm text-text-premium truncate group-hover:text-brand-gold transition-colors">
                      {friend.nickname || friend.profile.username}
                    </p>
                    {friend.nickname && (
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest opacity-40">
                        @{friend.profile.username}
                      </span>
                    )}
                    <button 
                      onClick={() => {
                        setEditingNickname(friend.friendshipId);
                        setNewNickname(friend.nickname || "");
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-brand-gold transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-[9px] font-black uppercase tracking-wider ${
                  friend.status === 'online' ? 'text-emerald-500' : 
                  friend.status === 'in-game' ? 'text-brand-gold' : 
                  'text-slate-500'
                }`}>
                  {friend.status === 'online' ? 'En Línea' : 
                   friend.status === 'in-game' ? 'En Partida' : 
                   'Desconectado'}
                </p>
                <span className="w-1 h-1 bg-white/10 rounded-full" />
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                  Nvl {friend.profile.level}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0 ml-2">
            <button 
              onClick={() => onChat(friend)}
              className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Escribir"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleInvite(friend.profile.id)}
              disabled={inviting === friend.profile.id}
              className={`p-3 bg-brand-gold/10 rounded-xl text-brand-gold hover:bg-brand-gold/20 transition-all ${inviting === friend.profile.id ? 'animate-pulse opacity-50' : ''}`}
              title="Invitar a jugar"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onRemove(friend.friendshipId)}
              className="p-3 bg-red-500/5 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
              title="Borrar amigo"
            >
              <UserX className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
