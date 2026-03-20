"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, MessageCircle, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getFriendships, removeFriendship } from "@/app/actions/social-actions";
import { FriendsList } from "./_components/FriendsList";
import { FriendRequests } from "./_components/FriendRequests";
import { AddFriendModal } from "./_components/AddFriendModal";
import { DirectChat } from "./_components/DirectChat";
import { usePresence, UserStatus } from "@/hooks/usePresence";
import { createClient } from "@/utils/supabase/client";
import { Toast, ToastType } from "@/components/ui/Toast";
import { useSearchParams } from "next/navigation";

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [data, setData] = useState<{ friends: any[], pendingIncoming: any[], pendingOutgoing: any[] }>({
    friends: [],
    pendingIncoming: [],
    pendingOutgoing: []
  });
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedChatFriend, setSelectedChatFriend] = useState<any | null>(null);

  const supabase = createClient();
  const searchParams = useSearchParams();
  const { getStatus } = usePresence(data.friends);

  const fetchData = useCallback(async () => {
    // setLoading(true); // Don't set loading on re-fetch to avoid flicker
    const res = await getFriendships();
    setData(res);
    setLoading(false);
  }, []);

  const showToast = (message: string, type: ToastType) => {
    setToast(null);
    setTimeout(() => setToast({ message, type }), 10);
  };

  useEffect(() => {
    fetchData();

    // Subscribe to friendship changes to auto-update lists
    const channel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Handle auto-opening chat from URL params
  useEffect(() => {
    if (!loading && data.friends.length > 0) {
      const chatId = searchParams.get('chat');
      if (chatId) {
        const friend = data.friends.find(f => f.profile.id === chatId);
        if (friend) {
          setSelectedChatFriend(friend);
        }
      }
    }
  }, [loading, data.friends, searchParams]);

  const handleRemoveFriend = async (friendshipId: string) => {
    if (confirm("¿Seguro que deseas eliminar a este amigo?")) {
      const res = await removeFriendship(friendshipId);
      if (res.success) {
        showToast("Amigo eliminado correctamente", "success");
        fetchData();
      } else {
        showToast("Error al eliminar amigo", "error");
      }
    }
  };

  // Map friends with real-time status
  const friendsWithStatus = data.friends.map(f => ({
    ...f,
    status: getStatus(f.profile.id)
  }));

  return (
    <div className="min-h-screen pb-24 pt-6 md:pt-12 px-4 sm:px-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex justify-between items-end relative">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-brand-gold/10 rounded text-[8px] font-black text-brand-gold uppercase tracking-widest border border-brand-gold/20">
              Social Club
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black italic text-white uppercase tracking-tighter leading-none">
            Amigos
          </h1>
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] opacity-60">
            Mesa Primera • Elite Club
          </p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="relative group p-4 bg-brand-gold text-black rounded-[1.5rem] shadow-xl shadow-brand-gold/10 hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border-4 border-slate-950">
             <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-pulse" />
          </div>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-1.5 bg-white/5 border border-white/5 rounded-[2rem] relative backdrop-blur-md">
        <button
          onClick={() => setActiveTab('friends')}
          className={`relative flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            activeTab === 'friends' ? 'text-black' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {activeTab === 'friends' && (
            <motion.div 
              layoutId="tab-bg" 
              className="absolute inset-0 bg-brand-gold rounded-full" 
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            Mis Amigos 
            {data.friends.length > 0 && (
              <span className={`px-1.5 rounded-md ${activeTab === 'friends' ? 'bg-black/10' : 'bg-white/5'}`}>
                {data.friends.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`relative flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            activeTab === 'requests' ? 'text-black' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {activeTab === 'requests' && (
            <motion.div 
              layoutId="tab-bg" 
              className="absolute inset-0 bg-brand-gold rounded-full" 
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            Solicitudes
            {data.pendingIncoming.length > 0 && (
              <span className={`px-1.5 rounded-md ${activeTab === 'requests' ? 'bg-black/10' : 'bg-brand-red text-white'}`}>
                {data.pendingIncoming.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Content */}
      <main className="relative min-h-[50vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Loader2 className="w-10 h-10 animate-spin text-brand-gold mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Sincronizando círculo...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'friends' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'friends' ? 20 : -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {activeTab === 'friends' ? (
                <FriendsList 
                  friends={friendsWithStatus} 
                  onChat={(f) => setSelectedChatFriend(f)}
                  onRemove={handleRemoveFriend}
                  onAction={showToast}
                  onRefresh={fetchData}
                />
              ) : (
                <FriendRequests 
                  requests={data.pendingIncoming} 
                  onAction={showToast}
                  onRefresh={fetchData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      {/* Modals & Drawers */}
      <AddFriendModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      
      <AnimatePresence>
        {selectedChatFriend && (
          <>
            {/* Backdrop for mobile mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChatFriend(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105]"
            />
            <DirectChat 
              friend={selectedChatFriend} 
              onClose={() => setSelectedChatFriend(null)} 
            />
          </>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      {!loading && (
        <footer className="text-center pt-8 pb-12 opacity-20">
          <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
            Los datos se actualizan en tiempo real
          </p>
        </footer>
      )}
    </div>
  );
}
