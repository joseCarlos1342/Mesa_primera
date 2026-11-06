"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { getFriendships, removeFriendship } from "@/app/actions/social-actions";
import { FriendsList, type Friend } from "./_components/FriendsList";
import { FriendRequests, type FriendRequest } from "./_components/FriendRequests";
import { AddFriendModal } from "./_components/AddFriendModal";
import { DirectChat } from "./_components/DirectChat";
import { usePresence } from "@/hooks/usePresence";
import { createClient } from "@/utils/supabase/client";
import { Toast, ToastType } from "@/components/ui/Toast";
import { useSearchParams } from "next/navigation";
import { PlayerSheet } from "@/components/player/PlayerSheet";
import { PageHeader, SegmentedTabs, Skeleton, playerButton } from "@/components/player/PlayerUI";
import { AuthButton } from "@/components/auth/AuthForm";

interface FriendshipsData {
  friends: Friend[];
  pendingIncoming: FriendRequest[];
  pendingOutgoing: FriendRequest[];
}

function FriendsContent() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [data, setData] = useState<FriendshipsData>({ friends: [], pendingIncoming: [], pendingOutgoing: [] });
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedChatFriend, setSelectedChatFriend] = useState<Friend | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<{ friendshipId: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const supabase = createClient();
  const searchParams = useSearchParams();
  const { getStatus } = usePresence(data.friends);

  const fetchData = useCallback(async () => {
    const res = (await getFriendships()) as FriendshipsData;
    setData(res);
    setLoading(false);
  }, []);

  const showToast = (message: string, type: ToastType) => {
    setToast(null);
    setTimeout(() => setToast({ message, type }), 10);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  // Abre el chat indicado en la URL (?chat=<id>), p. ej. desde una notificación.
  useEffect(() => {
    if (!loading && data.friends.length > 0) {
      const chatId = searchParams.get('chat');
      if (chatId) {
        const friend = data.friends.find((f) => f.profile.id === chatId);
        if (friend) setSelectedChatFriend(friend);
      }
    }
  }, [loading, data.friends, searchParams]);

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;

    setIsRemoving(true);
    const res = await removeFriendship(friendToRemove.friendshipId);
    if (res.success) {
      showToast("Amigo eliminado correctamente", "success");
      fetchData();
    } else {
      showToast("Error al eliminar amigo", "error");
    }
    setIsRemoving(false);
    setFriendToRemove(null);
  };

  const friendsWithStatus = data.friends.map((f) => ({ ...f, status: getStatus(f.profile.id) }));

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Amigos"
        lead="Invítalos a tu mesa y escríbeles sin salir de la app."
        action={
          <button type="button" onClick={() => setIsAddModalOpen(true)} aria-label="Agregar amigo" className={`${playerButton.primary} mt-1 min-h-12! px-4 text-base!`}>
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            <span>Agregar</span>
          </button>
        }
      />

      <SegmentedTabs
        label="Secciones de amigos"
        idPrefix="friends"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: 'friends', label: 'Mis amigos', badge: data.friends.length || undefined },
          { value: 'requests', label: 'Solicitudes', badge: data.pendingIncoming.length || undefined },
        ]}
      />

      <div id="friends-panel" role="tabpanel" aria-labelledby={`friends-tab-${activeTab}`} className="min-h-[40vh]">
        {loading ? (
          <div className="space-y-5" aria-busy="true" aria-label="Cargando amigos">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full!" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'friends' ? (
          <FriendsList
            friends={friendsWithStatus}
            onChat={(f) => setSelectedChatFriend(f)}
            onRemove={(id) => {
              const friend = data.friends.find((f) => f.friendshipId === id);
              if (friend) setFriendToRemove({ friendshipId: id, name: friend.nickname || friend.profile.username });
            }}
            onAction={showToast}
            onRefresh={fetchData}
            onAdd={() => setIsAddModalOpen(true)}
          />
        ) : (
          <FriendRequests requests={data.pendingIncoming} onAction={showToast} onRefresh={fetchData} />
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      <PlayerSheet
        open={friendToRemove !== null}
        onClose={() => !isRemoving && setFriendToRemove(null)}
        title="¿Eliminar amigo?"
        description={friendToRemove ? `${friendToRemove.name} saldrá de tu lista.` : undefined}
        closeLabel="Cerrar"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <AuthButton variant="secondary" onClick={() => setFriendToRemove(null)} disabled={isRemoving}>
              Cancelar
            </AuthButton>
            <button
              type="button"
              onClick={handleRemoveFriend}
              disabled={isRemoving}
              aria-busy={isRemoving || undefined}
              className={`${playerButton.dangerSolid} disabled:opacity-60`}
            >
              {isRemoving ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        }
      >
        <p className="text-lg leading-relaxed text-[#d9d3bf]">
          Ya no verás su estado ni podrás escribirle. Para volver a ser amigos tendrás que enviarle otra solicitud.
        </p>
      </PlayerSheet>

      {selectedChatFriend && <DirectChat friend={selectedChatFriend} onClose={() => setSelectedChatFriend(null)} />}
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <FriendsContent />
    </Suspense>
  );
}
