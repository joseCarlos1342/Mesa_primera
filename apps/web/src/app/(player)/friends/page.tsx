'use client'

import { motion } from 'framer-motion'
import { Users, UserPlus, MessageCircle, Gamepad2 } from 'lucide-react'

export default function FriendsPage() {
  const friends = [
    { name: 'Carlos Ortiz', status: 'En Partida', online: true },
    { name: 'Martha Lucia', status: 'En Línea', online: true },
    { name: 'Jaime Ruiz', status: 'Desconectado', online: false },
    { name: 'Elena Gomez', status: 'Jugando', online: true },
  ]

  return (
    <div className="min-h-full py-12 px-6 max-w-lg mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">Amigos</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Gestiona tu círculo de juego</p>
        </div>
        <button className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all text-white">
          <UserPlus className="w-6 h-6" />
        </button>
      </header>

      <div className="space-y-4">
        {friends.map((friend, i) => (
          <motion.div 
            key={friend.name}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/50 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:bg-slate-900 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 italic">
                  {friend.name.charAt(0)}
                </div>
                {friend.online && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-slate-950 rounded-full" />
                )}
              </div>
              <div>
                <p className="font-black text-slate-200">{friend.name}</p>
                <p className={`text-[10px] font-black uppercase tracking-widest ${friend.online ? 'text-emerald-500' : 'text-slate-600'}`}>
                  {friend.status}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
               <button className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
                  <MessageCircle className="w-5 h-5" />
               </button>
               {friend.online && friend.status !== 'En Partida' && (
                 <button className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    <Gamepad2 className="w-5 h-5" />
                 </button>
               )}
            </div>
          </motion.div>
        ))}
      </div>

      <button className="w-full h-16 border-2 border-dashed border-slate-800 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-colors">
        Buscar nuevos jugadores
      </button>
    </div>
  )
}
