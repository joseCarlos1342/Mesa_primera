"use client"

import { motion, AnimatePresence } from 'framer-motion'

interface PlayerBadgeProps {
  player: any;
  isActive: boolean;
  isMe: boolean;
  vertical?: boolean;
}

export function PlayerBadge({ player, isActive, isMe, vertical = true }: PlayerBadgeProps) {
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
        {/* Inner Avatar Image placeholder / Initial */}
        <div className={`
          w-full h-full rounded-full flex items-center justify-center
          bg-[#1b253b] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]
          border-2 border-black/50 shadow-inner
        `}>
          {isActive && (
            <motion.div 
              className="absolute inset-[0px] rounded-full border-[3px] border-[#4ade80]"
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          <span className={`${isMe ? 'text-2xl md:text-3xl' : 'text-lg md:text-2xl'} font-playfair font-black text-white/90 drop-shadow-md`}>
            {player.nickname?.charAt(0) || '?'}
          </span>
        </div>

        {/* Action Hand Icon for Active Player */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="absolute -top-2 -left-3 md:-left-4 bg-[#1b253b] border-2 border-[#4ade80] rounded-full p-1.5 shadow-[0_0_15px_rgba(74,222,128,0.6)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M18 11V6a2 2 0 0 0-4 0v4" />
                <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                <path d="M10 10.5V3a2 2 0 0 0-4 0v9" />
                <path d="M6 12v-1a2 2 0 0 0-4 0v6c0 4.4 3.6 8 8 8h3c4 0 7-3.6 7-8v-2a2 2 0 0 0-4 0v2" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Name and Saldo (Casino Style) */}
      <div className={`flex flex-col items-center justify-center w-full mt-1 ${isBoxStyle ? '' : 'drop-shadow-md'}`}>
        <p className={`text-white text-[10px] md:text-sm font-bold truncate w-full text-center tracking-wide ${isActive ? 'text-[#4ade80]' : ''}`}>
          {isMe ? 'TÚ' : player.nickname}
        </p>
        <div className="flex flex-col items-center leading-none mt-0.5">
          <span className={`text-[#4ade80] text-[10px] md:text-xs font-mono font-black tracking-wider drop-shadow-sm ${isBoxStyle ? 'mt-1' : ''}`}>
            ${player.chips?.toLocaleString() || '0'}
          </span>
        </div>
      </div>

      {/* Disconnected Overlay */}
      {!player.connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-3xl z-20">
           <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest bg-black px-2 py-1 pop-in border border-red-900">Afk</span>
        </div>
      )}
    </motion.div>
  )
}
