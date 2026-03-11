"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Mic } from 'lucide-react'

interface PlayerBadgeProps {
  player: any;
  isActive: boolean;
  isMe: boolean;
  isDealer?: boolean;
  vertical?: boolean;
}

export function PlayerBadge({ player, isActive, isMe, isDealer = false, vertical = true }: PlayerBadgeProps) {
  // Check if we render the dark green box style (only for 'isMe' in the new layout)
  const isBoxStyle = isMe;

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: isActive ? 1.05 : 1, opacity: player.isFolded ? 0.4 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`
        relative flex flex-col items-center group
        ${isBoxStyle ? 'bg-[#052e1f] border-[3px] border-[#0b4d35] rounded-xl md:rounded-2xl p-2 md:p-3 shadow-[0_10px_20px_rgba(0,0,0,0.5)]' : ''}
        ${isMe ? 'w-24 md:w-32' : 'w-20 md:w-28'}
      `}
    >
      {/* Avatar Circle */}
      <div className={`
        relative flex items-center justify-center rounded-full mb-1 md:mb-2
        ${isBoxStyle ? 'bg-gradient-to-br from-green-300 to-green-600' : 'bg-gradient-to-br from-white/20 to-transparent'}
        p-[2px] md:p-[3px] shadow-lg
        ${isMe ? 'w-14 h-14 md:w-20 md:h-20' : 'w-12 h-12 md:w-16 md:h-16'}
      `}>
        <div className={`
          w-full h-full rounded-full flex items-center justify-center
          bg-[#1b253b] bg-gradient-to-b from-[#2a3b5c] to-[#121929]
          border-[3px] shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)]
          ${isActive ? 'border-[#e2b044]' : 'border-gray-500/50'}
        `}>
          {isActive && (
            <motion.div 
              className="absolute inset-[0px] rounded-full border-[3px] border-[#fde047] shadow-[0_0_20px_rgba(253,224,71,0.5)]"
              animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}

          <span className={`${isMe ? 'text-2xl md:text-3xl' : 'text-lg md:text-2xl'} font-playfair font-bold text-white/90 drop-shadow-md`}>
            {player.nickname?.charAt(0) || '?'}
          </span>
        </div>

        {/* Action Hand Icon for Active Player - Replacing with Microphone as in screenshot */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="absolute bottom-0 -right-2 md:-right-3 bg-black/60 border border-[#e2b044] rounded-full p-1 shadow-md"
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`flex flex-col items-center justify-center w-full mt-1 ${isBoxStyle ? '' : 'drop-shadow-md'} relative z-10 bg-black/50 px-2 py-0.5 rounded-full border border-white/10`}>
        <p className={`text-white text-[10px] md:text-[13px] font-medium truncate w-full text-center tracking-wide uppercase`}>
          {isMe ? 'TÚ' : player.nickname}
        </p>
        <div className="flex flex-col items-center leading-none mt-0.5">
          <span className={`text-gray-300 text-[9px] md:text-[11px] font-mono font-bold tracking-wider drop-shadow-sm`}>
            ${player.chips?.toLocaleString() || '0'}
          </span>
        </div>
      </div>

      {/* LA MANO Ribbon */}
      {isDealer && !isMe && (
         <div className="mt-1 bg-gradient-to-r from-[#d4af37] to-[#a17822] text-black text-[8px] md:text-[9px] font-bold px-3 py-0.5 rounded-sm shadow-md border border-[#fff7d6]/50 uppercase tracking-widest relative">
           La Mano
         </div>
      )}

      {/* Disconnected Overlay */}
      {!player.connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-3xl z-20">
           <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest bg-black px-2 py-1 pop-in border border-red-900">Afk</span>
        </div>
      )}
    </motion.div>
  )
}
