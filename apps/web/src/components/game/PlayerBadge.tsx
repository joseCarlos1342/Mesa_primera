"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { getAvatarSvg } from '@/utils/avatars'

interface PlayerBadgeProps {
  player: any;
  isActive: boolean;
  isMe: boolean;
  isDealer?: boolean;
}

export function PlayerBadge({ player, isActive, isMe, isDealer = false }: PlayerBadgeProps) {
  const isMuted = true; // Placeholder for actual voice chat state if available

  // Determine avatar rendering
  let avatarContent = null;
  if (player.avatarUrl) {
    const avatarData = getAvatarSvg(player.avatarUrl);
    if (avatarData) {
      avatarContent = (
        <div 
          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[#1b253b]"
        >
          {avatarData}
        </div>
      );
    } else {
      avatarContent = (
        <img 
          src={player.avatarUrl} 
          alt={player.nickname || "Avatar"} 
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
  } else {
    // Empty state (Gray silhouette as in mockup)
    avatarContent = (
      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#878787] to-[#404040]">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[80%] h-[80%] text-[#2a2a2a] mt-4">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: isActive ? 1.05 : 1, opacity: player.connected === false ? 0.4 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative flex flex-col items-center group ${isMe ? 'z-50' : 'z-10'}`}
    >
       {/* Active Glow Ring Behind Avatar */}
       <AnimatePresence>
          {isActive && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.25, opacity: [0.5, 0.8, 0.5] }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1 left-1 right-1 bottom-10 bg-[#4ade80] rounded-full blur-[20px] z-0"
            />
          )}
       </AnimatePresence>

       {/* Avatar Circle Frame (Brushed Gold) */}
       <div className={`
         relative rounded-full mb-2 z-10 flex items-center justify-center
         ${isMe ? 'w-20 h-20 md:w-32 md:h-32 landscape:w-12 landscape:h-12 md:landscape:w-32 md:landscape:h-32' : 'w-14 h-14 md:w-24 md:h-24 landscape:w-9 landscape:h-9 md:landscape:w-24 md:landscape:h-24'}
         bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c]
         p-[3px] shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)]
       `}>
        {/* Inner shadow/border for depth */}
        <div className="w-full h-full rounded-full border border-black/40 overflow-hidden shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)] relative bg-[#111]">
          {avatarContent}
        </div>
      </div>

       {/* Name and Balance Tab */}
       <div className={`
         relative z-20 flex flex-col items-center justify-center w-max px-3 md:px-4 py-1.5 md:py-2 
         bg-gradient-to-b from-[#112a1a] to-[#0a180e] rounded-md md:rounded-lg 
         border ${isActive ? 'border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'border-[#d4af37]/30 shadow-[0_4px_8px_rgba(0,0,0,0.8)]'}
         -mt-6 md:-mt-8 landscape:-mt-4 landscape:py-1
       `}>
        <div className="flex items-center gap-2">
          <p className="text-[#e2c161] text-[9px] md:text-[11px] font-bold tracking-widest uppercase" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {player.nickname ? (isMe ? player.nickname.split(' ')[0] : player.nickname.split(' ')[0]) : 'VACÍO'}
          </p>
          {isActive ? (
             <Mic className="w-3 h-3 md:w-4 md:h-4 text-[#4ade80] drop-shadow-[0_0_5px_rgba(74,222,128,1)]" />
          ) : (
             <MicOff className="w-3 h-3 md:w-4 md:h-4 text-[#d4af37]/50" />
          )}
        </div>
        
        <span className="text-[#c1a052] text-[8px] md:text-[10px] font-mono font-black tracking-widest mt-0.5 opacity-80">
          ${player.chips != null ? 'XXXXXXX' : 'XXXXXXX'} 
          {/* Note: The mockup shows masked balances $XXXXXXX for privacy/aesthetic in the lobby/others. Can also show real value if desired. */}
        </span>
      </div>

      {/* LA MANO Ribbon (Dealer) */}
      {isDealer && (
         <div className="absolute -right-4 -top-2 bg-gradient-to-r from-[#d4af37] to-[#a17822] text-black text-[8px] md:text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-[#fff7d6]/50 uppercase tracking-widest z-30">
           Mano
         </div>
      )}

      {/* Disconnected Overlay */}
      {player.connected === false && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full z-40 mx-auto w-[80%] aspect-square top-0">
           <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest bg-black px-2 py-1 border border-red-900">Afk</span>
        </div>
      )}
    </motion.div>
  )
}
