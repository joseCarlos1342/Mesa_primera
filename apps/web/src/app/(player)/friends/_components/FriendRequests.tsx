"use client";

import { Inbox } from "lucide-react";
import { acceptFriendRequest, removeFriendship } from "@/app/actions/social-actions";
import { useState } from "react";
import { ToastType } from "@/components/ui/Toast";
import { AuthButton } from "@/components/auth/AuthForm";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { EmptyState } from "@/components/player/PlayerUI";

export interface FriendRequest {
  friendshipId: string;
  profile?: { id?: string; username?: string; avatar_url?: string | null; level?: number } | null;
}

interface FriendRequestsProps {
  requests: FriendRequest[];
  onAction: (message: string, type: ToastType) => void;
  onRefresh: () => void;
}

export function FriendRequests({ requests, onAction, onRefresh }: FriendRequestsProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAccept = async (id: string) => {
    setProcessing(id);
    const res = await acceptFriendRequest(id);
    if (res.success) {
      onAction("Solicitud aceptada", "success");
      onRefresh();
    } else {
      onAction(res.error || "Error al aceptar solicitud", "error");
    }
    setProcessing(null);
  };

  const handleDecline = async (id: string) => {
    setProcessing(id);
    const res = await removeFriendship(id);
    if (res.success) {
      onAction("Solicitud rechazada", "info");
      onRefresh();
    } else {
      onAction(res.error || "Error al procesar", "error");
    }
    setProcessing(null);
  };

  if (!requests || requests.length === 0) {
    return <EmptyState icon={Inbox} title="Sin solicitudes pendientes" text="Cuando alguien te agregue, podrás aceptarlo aquí." />;
  }

  return (
    <ul className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
      {requests.map((req) => {
        const busy = processing === req.friendshipId;
        return (
          <li key={req.friendshipId} className="py-5">
            <div className="flex items-center gap-4">
              <PlayerAvatar avatar={req.profile?.avatar_url} name={req.profile?.username} size={52} />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-text-premium">{req.profile?.username}</p>
                <p className="text-base text-[#bdb7a6]">Nivel {req.profile?.level} · quiere ser tu amigo</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <AuthButton variant="secondary" onClick={() => handleDecline(req.friendshipId)} disabled={busy} className="min-h-12! text-base!">
                Rechazar
              </AuthButton>
              <AuthButton onClick={() => handleAccept(req.friendshipId)} pending={busy} className="min-h-12! text-base!">
                Aceptar
              </AuthButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
