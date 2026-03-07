"use client"

import { motion, AnimatePresence } from 'framer-motion'

interface PlayerBadgeProps {
  player: any;
  isActive: boolean;
  isMe: boolean;
}

export function PlayerBadge({ player, isActive, isMe }: PlayerBadgeProps) {
  // For the realistic casino vibe, we use bronze/gold borders and green glowing text
  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: isActive ? 1.05 : 1, opacity: player.isFolded ? 0.4 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative flex flex-col items-center ${isMe ? 'w-32 md:w-40' : 'w-24 md:w-32'} group`}
    >
      {/* Avatar Circle with Gold/Bronze Trim */}
      <div className={`
        relative flex items-center justify-center rounded-full mb-1
        bg-gradient-to-br from-[#d4af37] via-[#aa7b22] to-[#6b4c13] p-[3px]
        shadow-2xl
        ${isMe ? 'w-16 h-16 md:w-20 md:h-20' : 'w-12 h-12 md:w-16 md:h-16'}
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

          <span className={`${isMe ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'} font-playfair font-black text-white/90 drop-shadow-md`}>
            {player.nickname.charAt(0)}
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

        {/* Microphone Mockup */}
        <div className="absolute -bottom-1 -right-1 md:-right-2 bg-black/60 rounded-full p-1 shadow-md border border-white/10">
           <svg viewBox="0 0 24 24" fill="none" stroke="#a8b2d1" strokeWidth="2" className="w-3 h-3 md:w-4 md:h-4">
             <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
             <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
             <line x1="12" x2="12" y1="19" y2="22" />
             <line x1="8" x2="16" y1="22" y2="22" />
           </svg>
        </div>
      </div>

      {/* Name and Saldo Box (Casino Style) */}
      <div className={`
        flex flex-col items-center justify-center w-[120%] md:w-full px-2 py-1 rounded-sm
        bg-black/70 border-b-2 border-[#1a3821] shadow-xl mt-1
      `}>
        <p className={`text-white text-[10px] md:text-xs font-bold truncate w-full text-center uppercase tracking-wide ${isActive ? 'text-[#4ade80]' : ''}`}>
          {player.nickname}
        </p>
        <div className="flex flex-col items-center leading-none mt-0.5">
          <span className="text-[#a8b2d1] text-[7px] md:text-[8px] uppercase tracking-[0.15em]">Saldo Actual:</span>
          <span className="text-[#4ade80] text-[10px] md:text-xs font-mono font-bold tracking-wider mt-0.5 drop-shadow-[0_0_2px_rgba(74,222,128,0.8)]">
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
