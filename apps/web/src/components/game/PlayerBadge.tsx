"use client"

import { m, AnimatePresence } from 'framer-motion'
import { getAvatarSvg } from '@/utils/avatars'
import { formatCurrency } from '@/utils/format'

interface PlayerBadgeProps {
  player: any;
  isActive: boolean;
  isMe: boolean;
  isDealer?: boolean;
  hideAvatar?: boolean;
  points?: number;
  /** Posición de turno: 1 = La Mano (ya indicado por isDealer), 2+ = próximos en recibir la mano */
  turnOrder?: number;
}

export function PlayerBadge({ player, isActive, isMe, isDealer = false, hideAvatar = false, points, turnOrder }: PlayerBadgeProps) {
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
    <m.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: player.connected === false ? 0.4 : 1 }}
      transition={{ duration: 0.3 }}
      className={`relative flex flex-col items-center group ${isMe ? 'z-50' : 'z-10'}`}
    >

       {/* Horizontal Pill Container */}
       <div className={`
         relative z-20 flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1 md:py-1.5
         bg-gradient-to-r from-[#112a1a] via-[#0a180e] to-[#112a1a] 
         rounded-full border 
         ${isActive ? 'border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'border-[#d4af37]/40 shadow-[0_4px_12px_rgba(0,0,0,0.6)]'}
         transition-all duration-300
       `}>
         
         {/* Small Avatar Circle */}
         {!hideAvatar && (
            <div className={`
              relative rounded-full flex-shrink-0 flex items-center justify-center
              w-8 h-8 md:w-10 md:h-10 
              bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c]
              p-[2px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]
            `}>
              <div className="w-full h-full rounded-full overflow-hidden bg-[#111] border border-black/20">
                {avatarContent}
              </div>
            </div>
         )}

         {/* Info Column (Name & Balance) */}
         <div className="flex flex-col items-start pr-2">
            <span className="text-[#e2c161] text-[9px] md:text-[11px] font-bold tracking-wider uppercase truncate max-w-[60px] md:max-w-[80px]">
              {player.nickname ? player.nickname.split(' ')[0] : 'VACÍO'}
            </span>
            <span className="text-[#c1a052] text-[8px] md:text-[9px] font-mono font-bold opacity-90 flex items-center">
              {player.chips != null ? formatCurrency(player.chips) : '$0'}
              {points != null && (
                <span className="ml-2 pl-2 border-l border-white/20 text-[#d4af37] font-sans font-black">
                  {points} PTS
                </span>
              )}
            </span>
         </div>

         {/* Dealer Icon (Compact) */}
         {isDealer && (
            <div className="bg-[#d4af37] text-black text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-sm border border-white/20 uppercase tracking-tighter">
              Mano
            </div>
         )}

         {/* Turno de Mano: "2ª", "3ª"... para que todos sepan quién sigue después */}
         {!isDealer && (turnOrder ?? 0) > 1 && (
            <div className="bg-[#0d2e1b] text-[#d4af37] border border-[#d4af37]/50 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
              {turnOrder}ª
            </div>
         )}
       </div>

       {/* Disconnected Overlay (Small Icon instead of full overlay) */}
       {player.connected === false && (
         <div className="absolute -left-1 -top-1 bg-red-600 rounded-full p-1 border border-red-900 z-50 shadow-lg">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
         </div>
       )}
    </m.div>
  )
}
