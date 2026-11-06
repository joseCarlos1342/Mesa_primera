"use client";

import { useState } from "react";
import { Check, Gamepad2, MessageCircle, Pencil, Users, UserX, X } from "lucide-react";
import { inviteToPlay, updateFriendNickname } from "@/app/actions/social-actions";
import { ToastType } from "@/components/ui/Toast";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { EmptyState } from "@/components/player/PlayerUI";

export type PresenceStatus = 'online' | 'offline' | 'in-game';

export interface Friend {
  friendshipId: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    level: number;
  };
  status?: PresenceStatus;
  nickname?: string;
}

interface FriendsListProps {
  friends: Friend[];
  onChat: (friend: Friend) => void;
  onRemove: (friendshipId: string) => void;
  onAction: (message: string, type: ToastType) => void;
  onRefresh: () => void;
  /** Acción del estado vacío (abrir "Agregar amigo"). */
  onAdd?: () => void;
}

const PRESENCE: Record<PresenceStatus, { label: string; dot: string; text: string }> = {
  online: { label: 'En línea', dot: 'bg-[#2ecc71]', text: 'text-[#7fe0a6]' },
  'in-game': { label: 'En partida', dot: 'bg-brand-gold', text: 'text-brand-gold-light' },
  offline: { label: 'Desconectado', dot: 'bg-[#6b6458]', text: 'text-[#bdb7a6]' },
};

export function presenceOf(status?: PresenceStatus) {
  return PRESENCE[status ?? 'offline'];
}

const actionButton =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-60';

export function FriendsList({ friends, onChat, onRemove, onAction, onRefresh, onAdd }: FriendsListProps) {
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
      onAction("Invitación enviada", "success");
    } else {
      onAction("Error al enviar invitación", "error");
    }
    setInviting(null);
  };

  if (!friends || friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aún no tienes amigos"
        text="Busca a tus conocidos por nombre o celular y juega con ellos en la misma mesa."
        action={
          onAdd ? (
            <button type="button" onClick={onAdd} className={`${actionButton} w-full border-[#8b6b2e]/80 text-lg text-text-premium hover:border-brand-gold`}>
              Agregar amigo
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:divide-y-0 lg:border-0">
      {friends.map((friend) => {
        const name = friend.nickname || friend.profile.username;
        const presence = presenceOf(friend.status);
        const editing = editingNickname === friend.friendshipId;
        return (
          <li key={friend.friendshipId} className="py-5 lg:border-b lg:border-[#8b6b2e]/30">
            <div className="flex items-center gap-4">
              <span className="relative shrink-0">
                <PlayerAvatar avatar={friend.profile.avatar_url} name={friend.profile.username} size={56} />
                <span aria-hidden="true" className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full shadow-[0_0_0_3px_#0a0a0a] ${presence.dot}`} />
              </span>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateNickname(friend.friendshipId);
                    }}
                  >
                    <label htmlFor={`nick-${friend.friendshipId}`} className="sr-only">
                      Apodo para {friend.profile.username}
                    </label>
                    <input
                      id={`nick-${friend.friendshipId}`}
                      autoFocus
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="h-12 min-w-0 flex-1 rounded-lg border border-[#8b6b2e]/70 bg-[#120806] px-3 text-lg text-text-premium caret-brand-gold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/35"
                    />
                    <button type="submit" aria-label="Guardar apodo" className={`${actionButton} w-12 border-[#2ecc71]/50 px-0 text-[#7fe0a6]`}>
                      <Check className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setEditingNickname(null)} aria-label="Cancelar apodo" className={`${actionButton} w-12 border-[#8b6b2e]/60 px-0 text-[#d9d3bf]`}>
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="min-w-0 truncate text-lg font-semibold text-text-premium">{name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNickname(friend.friendshipId);
                        setNewNickname(friend.nickname || "");
                      }}
                      aria-label={`Cambiar apodo de ${name}`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#c5a059] transition-colors hover:bg-[#1b0d08] hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <p className="text-base">
                  <span className={presence.text}>{presence.label}</span>
                  {friend.nickname && (
                    <span className="text-[#bdb7a6]">
                      {' · '}
                      {friend.profile.username.startsWith('@') ? '' : '@'}
                      {friend.profile.username}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
              <button type="button" onClick={() => onChat(friend)} className={`${actionButton} border-[#8b6b2e]/80 text-text-premium hover:border-brand-gold hover:text-brand-gold-light`}>
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Mensaje
              </button>
              <button
                type="button"
                onClick={() => handleInvite(friend.profile.id)}
                disabled={inviting === friend.profile.id}
                aria-busy={inviting === friend.profile.id || undefined}
                className={`${actionButton} border-[#8b6b2e]/80 text-text-premium hover:border-brand-gold hover:text-brand-gold-light`}
              >
                <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                {inviting === friend.profile.id ? 'Enviando…' : 'Invitar'}
              </button>
              <button
                type="button"
                onClick={() => onRemove(friend.friendshipId)}
                aria-label={`Eliminar a ${name}`}
                title="Eliminar amigo"
                className={`${actionButton} w-12 border-[#e74c3c]/45 px-0 text-[#f08a7e] hover:border-[#e74c3c] hover:bg-[#2a0f0c]`}
              >
                <UserX className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
