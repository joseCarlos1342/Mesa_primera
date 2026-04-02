"use client";

import { useState } from "react";
import { Search, UserPlus, Loader2, X, User } from "lucide-react";
import { searchUsers, sendFriendRequest } from "@/app/actions/social-actions";
import { motion, AnimatePresence } from "framer-motion";
import { getAvatarSvg } from "@/utils/avatars";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 3) return;
    
    setLoading(true);
    const users = await searchUsers(query);
    setResults(users);
    setLoading(false);
  };

  const handleAddFriend = async (userId: string) => {
    setRequesting(userId);
    const res = await sendFriendRequest(userId);
    if (res.success) {
      setResults(prev => prev.filter(u => u.id !== userId));
    }
    setRequesting(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-[92%] sm:max-w-md bg-[#0a2a1f] border-2 border-brand-gold/20 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(202,171,114,0.06)_0%,_transparent_60%)] pointer-events-none" />
            <div className="relative p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-display font-black italic text-brand-gold uppercase tracking-tight leading-none">Añadir Amigo</h2>
                  <p className="text-[9px] font-bold text-brand-gold/40 uppercase tracking-widest">Localiza a tus conocidos</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-brand-gold/10 rounded-full transition-colors text-brand-gold/60 -mr-2 -mt-2">
                  <X className="w-5 h-5 sm:w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 sm:w-5 h-5 text-brand-gold/40 group-focus-within:text-brand-gold transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Nombre, apodo o teléfono..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-black/40 border-2 border-brand-gold/10 rounded-2xl py-4 pl-11 sm:pl-14 pr-16 sm:pr-20 text-sm sm:text-base text-white placeholder:text-brand-gold/20 focus:outline-none focus:border-brand-gold/40 transition-all font-medium"
                />
                <button 
                  type="submit"
                  disabled={loading || query.length < 3}
                  className="absolute inset-y-2 right-2 px-3 sm:px-4 bg-brand-gold text-black rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </form>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {results.length > 0 ? (
                  results.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-black/30 border border-brand-gold/10 rounded-2xl group hover:bg-black/50 hover:border-brand-gold/25 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-[#0a2a1f] rounded-xl flex items-center justify-center border border-brand-gold/20 overflow-hidden relative">
                            {u.avatar_url && getAvatarSvg(u.avatar_url) ? (
                              <div className="w-full h-full scale-[1.2]">
                                {getAvatarSvg(u.avatar_url)}
                              </div>
                            ) : (
                              <span className="text-sm font-black text-brand-gold/60 italic">
                                {u.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{u.username}</p>
                          <p className="text-[10px] text-brand-gold/40 uppercase tracking-widest truncate">{u.full_name || `Nivel ${u.level}`}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddFriend(u.id)}
                        disabled={requesting === u.id}
                        className="p-2.5 bg-brand-gold text-black rounded-xl hover:scale-110 active:scale-90 transition-all disabled:opacity-50 shadow-lg"
                      >
                        {requesting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      </button>
                    </div>
                  ))
                ) : !loading && query.length >= 3 ? (
                  <p className="text-center text-brand-gold/40 text-sm py-4">No se encontraron jugadores.</p>
                ) : (
                  <div className="text-center text-brand-gold/30 text-xs py-8 space-y-2">
                    <User className="w-8 h-8 mx-auto opacity-30" />
                    <p>Busca por nombre, apodo o celular</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
