"use client";

import { Check, X, Loader2, UserPlus } from "lucide-react";
import { acceptFriendRequest, removeFriendship } from "@/app/actions/social-actions";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAvatarSvg } from "@/utils/avatars";
import { ToastType } from "@/components/ui/Toast";

interface FriendRequestsProps {
  requests: any[];
  onAction: (message: string, type: ToastType) => void;
  onRefresh: () => void;
}

export function FriendRequests({ requests, onAction, onRefresh }: FriendRequestsProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAccept = async (id: string) => {
    setProcessing(id);
    const res = await acceptFriendRequest(id);
    if (res.success) {
      onAction("¡Solicitud aceptada!", "success");
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
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] opacity-40">
        <UserPlus className="w-12 h-12 mb-4 text-slate-500" />
        <p className="font-display font-black italic uppercase tracking-widest text-sm text-slate-400">Sin Solicitudes Pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {requests.map((req, i) => (
          <motion.div
            key={req.friendshipId}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-slate-900/50 border border-white/5 p-6 rounded-[2rem] hover:bg-slate-900 transition-all shadow-xl overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center border border-brand-gold/20 shadow-xl overflow-hidden relative">
                    {req.profile?.avatar_url && getAvatarSvg(req.profile.avatar_url) ? (
                      <div className="w-full h-full scale-[1.2]">
                        {getAvatarSvg(req.profile.avatar_url)}
                      </div>
                    ) : (
                      <span className="text-xl font-black text-slate-400 italic uppercase">
                        {req.profile?.username?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-gold border-4 border-slate-950 rounded-full flex items-center justify-center">
                    <UserPlus className="w-2.5 h-2.5 text-black" />
                  </div>
                </div>
                <div>
                  <p className="font-display font-black italic uppercase text-lg text-text-premium group-hover:text-brand-gold transition-colors">
                    {req.profile?.username}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Nivel {req.profile?.level}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(req.friendshipId)}
                  disabled={processing === req.friendshipId}
                  className="p-4 bg-emerald-500 text-black rounded-2xl shadow-lg shadow-emerald-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  title="Aceptar"
                >
                  {processing === req.friendshipId ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleDecline(req.friendshipId)}
                  disabled={processing === req.friendshipId}
                  className="p-4 bg-white/5 text-slate-400 rounded-2xl border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                  title="Rechazar"
                >
                  {processing === req.friendshipId ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 blur-[4rem] rounded-full -mr-16 -mt-16 group-hover:bg-brand-gold/10 transition-colors" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
