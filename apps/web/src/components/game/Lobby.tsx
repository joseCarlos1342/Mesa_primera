"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { RoomAvailable, Room } from '@colyseus/sdk'
import { useRouter } from 'next/navigation'
import { Plus, Users, Zap, Trophy, Shield, RefreshCcw, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DepositModal } from '@/components/game/DepositModal'

export function Lobby() {
  const [rooms, setRooms] = useState<RoomAvailable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()
  const lobbyRoomRef = useRef<Room | null>(null)

  const [showDeposit, setShowDeposit] = useState(false)

  const connectToLobby = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (lobbyRoomRef.current) {
        lobbyRoomRef.current.leave()
      }

      const lobby = await client.joinOrCreate("lobby")
      lobbyRoomRef.current = lobby

      lobby.onMessage("rooms", (availableRooms) => {
        setRooms(availableRooms)
        setLoading(false)
      })

      lobby.onMessage("+", ([roomId, room]) => {
        setRooms((prev) => {
          const index = prev.findIndex((r) => r.roomId === roomId)
          if (index !== -1) {
            const next = [...prev]
            next[index] = room
            return next
          }
          return [...prev, room]
        })
      })

      lobby.onMessage("-", (roomId) => {
        setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
      })

    } catch (e: any) {
      console.error("Lobby Connection Error:", e)
      setError("No se pudo conectar con el servidor de juegos. Reintentando...")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const syncUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setIsAdmin(profile.role === 'admin')
          
          // Fetch real balance from wallets table (field is balance_cents)
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance_cents')
            .eq('user_id', user.id)
            .single()
          
          const profileWithBalance = {
            ...profile,
            balance: wallet ? wallet.balance_cents / 100 : 0
          }
          
          setUserProfile(profileWithBalance)
          if (profile.username) {
            localStorage.setItem('nickname', profile.username)
          }
          if (profile.avatar_url) {
            localStorage.setItem('avatarUrl', profile.avatar_url)
          } else if (user.user_metadata?.avatar_url) {
            localStorage.setItem('avatarUrl', user.user_metadata.avatar_url)
          }
        }
      }
    }

    // Auto-reconnection logic: check for active tokens in sessionStorage
    const checkActiveSessions = () => {
      const keys = Object.keys(sessionStorage);
      const reconnectionTokenKey = keys.find(k => k.startsWith('reconnectionToken_'));
      
      if (reconnectionTokenKey) {
        const roomId = reconnectionTokenKey.split('_')[1];
        console.log(`[Lobby] Active session detected for room ${roomId}. Redirecting...`);
        setReconnecting(true);
        router.push(`/play/${roomId}`);
        return true;
      }
      return false;
    }

    if (!checkActiveSessions()) {
      syncUser()
      connectToLobby()
    }

    return () => {
      if (lobbyRoomRef.current) {
        lobbyRoomRef.current.leave()
      }
    }
  }, [connectToLobby, router])

  const createTable = async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      let nick = localStorage.getItem('nickname');
      if (!nick) {
        nick = 'Jugador ' + Math.floor(Math.random() * 1000);
        localStorage.setItem('nickname', nick);
      }
      
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', deviceId);
      }
      
      const avatarUrl = localStorage.getItem('avatarUrl') || 'as-oros';

      const room = await client.create("mesa", { 
        tableName: `Mesa #${rooms.length + 1}`,
        maxPlayers: 7,
        nickname: nick,
        deviceId: deviceId,
        avatarUrl: avatarUrl
      })
      
      sessionStorage.setItem(`reconnectionToken_${room.roomId}`, room.reconnectionToken);
      sessionStorage.setItem(`nickname_${room.roomId}`, nick);
      
      if (room.connection?.transport?.close) {
         room.connection.transport.close();
      } else {
         try { (room.connection as any).close(); } catch(e){}
      }

      router.push(`/play/${room.roomId}`)
    } catch (e: any) {
      console.error("Room Creation Error:", e)
      setError("Error al crear la mesa. Asegúrate de que el servidor esté activo.")
      setCreating(false)
    }
  }

  const joinTable = (roomId: string) => {
    router.push(`/play/${roomId}`)
  }

  const deleteTable = async (roomId: string) => {
    if (!isAdmin) return;
    if (!confirm("¿Estás seguro de que deseas eliminar esta mesa?")) return;
    
    try {
      const roomToDelete = await client.joinById(roomId);
      roomToDelete.send("delete-room", { adminToken: userProfile?.id });
    } catch (e) {
      console.error("Error deleting room:", e);
      alert("No se pudo eliminar la mesa.");
    }
  }

  const fixedTableNames = ["Mesa #1", "Mesa #2"];
  const fixedTablesToShow = fixedTableNames.map((name, idx) => {
    const existing = rooms.find(r => (r.metadata as any)?.tableName === name);
    if (existing) return existing;
    return {
      roomId: `placeholder-${idx}`,
      metadata: { tableName: name, isPlaceholder: true },
      clients: 0,
      maxClients: 7
    } as any;
  });

  const otherTables = rooms.filter(r => !fixedTableNames.includes((r.metadata as any)?.tableName));

  return (
    <div className="min-h-screen w-full bg-table animate-in fade-in duration-1000">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-12 space-y-12 pb-24">
      {reconnecting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-black to-[#0d0d14] backdrop-blur-xl animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-[url('/textures/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c5a059]/10 blur-[150px] rounded-full pointer-events-none" />
           
           <div className="relative z-10 flex flex-col items-center text-center px-4">
             <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-[#c5a059]/30 flex items-center justify-center bg-black/50 shadow-[0_0_50px_rgba(197,160,89,0.3)] mb-8">
               <RefreshCcw className="w-12 h-12 md:w-16 md:h-16 text-[#c5a059] animate-spin" />
             </div>
             
             <h2 className="text-3xl md:text-5xl font-display font-black uppercase tracking-[0.3em] text-white italic drop-shadow-premium mb-4">
               Reconectando
             </h2>
             <span className="font-display font-black italic tracking-widest uppercase text-sm md:text-xl text-[#c5a059]/70 drop-shadow-md max-w-sm mb-12">
               Restaurando tu sesión en la mesa...
             </span>
             
             <button 
               onClick={() => {
                 const keys = Object.keys(sessionStorage);
                 keys.forEach(k => {
                   if (k.startsWith('reconnectionToken_')) {
                     sessionStorage.removeItem(k);
                   }
                 });
                 setReconnecting(false);
               }}
               className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 hover:text-red-400 border border-red-500/30 rounded-full font-bold uppercase tracking-widest text-xs md:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
             >
               Cancelar
             </button>
           </div>
        </div>
      )}

      {/* Premium Header Section */}
      <header className="flex flex-col items-center justify-center gap-12 pb-20 relative px-4">
        {/* 1. Server Status & Tables - Larger and Primary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-4 px-8 py-3 bg-accent-gold/5 border-2 border-accent-gold/30 rounded-full backdrop-blur-xl shadow-[0_0_30px_rgba(202,171,114,0.1)]"
        >
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <span className="text-[11px] md:text-sm font-black text-accent-gold uppercase tracking-[0.4em]">SERVIDOR ACTIVO</span>
          <div className="w-px h-5 bg-white/20 mx-2" />
          <span className="text-[11px] md:text-sm font-black text-white uppercase tracking-[0.2em]">
            {rooms.length} MESAS DISPONIBLES
          </span>
        </motion.div>

        {/* 2. Main Title & Subtitle - Impactful Size */}
        <div className="flex flex-col items-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-8xl md:text-9xl lg:text-[10rem] font-display font-black italic text-[#c0a060] uppercase tracking-tighter leading-[0.75] drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)] pr-4"
          >
            Lobby
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4"
          >
            <div className="h-px w-8 md:w-16 bg-gradient-to-r from-transparent to-slate-500" />
            <p className="text-sm md:text-base font-black text-slate-400 uppercase tracking-[0.5em] italic text-center">
              Selecciona tu mesa de primera
            </p>
            <div className="h-px w-8 md:w-16 bg-gradient-to-l from-transparent to-slate-500" />
          </motion.div>
        </div>

        {/* 3. Balance Section - Prominent and Large */}
        {userProfile && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row items-center gap-8 pl-10 pr-4 py-4 rounded-[3rem] bg-slate-950/60 backdrop-blur-3xl border-2 border-accent-gold/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all hover:border-accent-gold/40"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-accent-gold/50 group-hover:text-accent-gold/70 transition-colors mb-1">Mi Balance</span>
              <span className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none flex items-center drop-shadow-premium">
                <span className="text-accent-gold mr-2 opacity-80">$</span>
                {userProfile.balance?.toLocaleString() || '0'}
              </span>
            </div>
            <button 
              onClick={() => setShowDeposit(true)}
              className="w-20 h-20 rounded-3xl bg-accent-gold-shimmer flex items-center justify-center shadow-[0_10px_30px_rgba(202,171,114,0.3)] hover:scale-105 hover:shadow-accent-gold/50 transition-all active:scale-95 group/btn relative overflow-hidden"
              title="Cargar Saldo"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              <Plus className="w-10 h-10 text-slate-950 stroke-[4]" />
            </button>
          </motion.div>
        )}

        {/* Floating Admin Actions - Offset to not interfere with main flow */}
        {isAdmin && (
          <div className="absolute top-8 right-8">
            <button 
              onClick={createTable}
              disabled={creating}
              className="group relative h-20 w-20 bg-white text-slate-950 rounded-[2.5rem] font-black flex items-center justify-center transition-all hover:bg-accent-gold hover:text-white hover:scale-105 active:scale-95 disabled:opacity-50 shadow-premium border-2 border-transparent hover:border-white/20"
              title="Nueva Mesa"
            >
              <Plus className="w-8 h-8 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area - Anchored with Premium Table Container */}
      <div className="relative p-10 md:p-16 lg:p-20 bg-gradient-to-b from-[#1b4d3e]/40 to-[#0d211a]/60 backdrop-blur-3xl rounded-[5rem] border-2 border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden min-h-[800px]">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[150px] -mr-64 -mt-64 opacity-60" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[150px] -ml-64 -mb-64 opacity-30" />
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('/textures/noise.png')] mix-blend-overlay" />

        <div className="relative z-10 space-y-20">
          {/* Mesas Principales */}
          <div className="space-y-12">
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-accent-gold/10 rounded-2xl flex items-center justify-center border-2 border-accent-gold/30 shadow-2xl">
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-accent-gold" />
              </div>
              <div className="space-y-1 flex flex-col items-center md:items-start">
                <h2 className="text-3xl md:text-4xl font-display font-black italic uppercase text-white tracking-widest drop-shadow-premium">Mesas</h2>
                <div className="h-1 w-16 md:w-20 bg-accent-gold/40 rounded-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 lg:gap-16">
              {fixedTablesToShow.map((room) => (
                <TableCard 
                  key={room.roomId} 
                  room={room} 
                  isAdmin={isAdmin} 
                  onJoin={joinTable} 
                  onDelete={deleteTable}
                  isFixed={true}
                  creating={creating}
                  setCreating={setCreating}
                />
              ))}
            </div>
          </div>

          {/* Otras Mesas */}
          {otherTables.length > 0 && (
            <div className="space-y-12 pt-20 border-t-2 border-white/5">
              <div className="flex items-center justify-center gap-4 md:gap-6">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-white/10">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-slate-500" />
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-black italic uppercase text-slate-400 tracking-widest">Mesas</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {otherTables.map((room) => (
                  <TableCard 
                    key={room.roomId} 
                    room={room} 
                    isAdmin={isAdmin} 
                    onJoin={joinTable} 
                    onDelete={deleteTable}
                    isFixed={false}
                    creating={creating}
                    setCreating={setCreating}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Bottom info - Enhanced for Accessibility */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-16 opacity-40 pt-24 border-t-2 border-white/5">
        <div className="flex items-center gap-4 text-sm font-black uppercase tracking-[0.3em] text-white">
          <Shield className="w-6 h-6 text-accent-gold" /> Seguridad de Élite
        </div>
        <div className="flex items-center gap-4 text-sm font-black uppercase tracking-[0.3em] text-white">
          <Shield className="w-6 h-6 text-accent-gold" /> Juego Auditado
        </div>
        <div className="flex items-center gap-4 text-sm font-black uppercase tracking-[0.3em] text-accent-gold">
          <Shield className="w-6 h-6" /> Conexión Blindada
        </div>
      </div>

      <DepositModal 
        isOpen={showDeposit} 
        onClose={() => setShowDeposit(false)} 
      />
    </div>
  </div>
)
}

function TableCard({ room, isAdmin, onJoin, onDelete, isFixed, creating, setCreating }: { 
  room: any, 
  isAdmin: boolean, 
  onJoin: (id: string) => void,
  onDelete: (id: string) => void,
  isFixed: boolean,
  creating: boolean,
  setCreating: (v: boolean) => void
}) {
  const isPlaceholder = room.metadata?.isPlaceholder;
  
  const handleAction = async () => {
    if (isPlaceholder) {
      if (creating) return;
      setCreating(true);
      try {
        const nick = localStorage.getItem('nickname') || 'Jugador';
        const deviceId = localStorage.getItem('deviceId') || 'dev_' + Math.random();
        const avatarUrl = localStorage.getItem('avatarUrl') || 'as-oros';
        
        localStorage.setItem('nickname', nick);
        localStorage.setItem('deviceId', deviceId);

        const newRoom = await client.create("mesa", { 
          tableName: room.metadata.tableName,
          maxPlayers: 7,
          nickname: nick,
          deviceId: deviceId,
          avatarUrl: avatarUrl
        });
        
        sessionStorage.setItem(`reconnectionToken_${newRoom.roomId}`, newRoom.reconnectionToken);
        sessionStorage.setItem(`nickname_${newRoom.roomId}`, nick);
        
        if (newRoom.connection?.transport?.close) {
           newRoom.connection.transport.close();
        } else {
           try { (newRoom.connection as any).close(); } catch(e){}
        }

        onJoin(newRoom.roomId);
      } catch (e) {
        console.error("Error creating fixed table:", e);
        setCreating(false);
      }
    } else {
      onJoin(room.roomId);
    }
  };

  return (
    <div className={`group relative bg-slate-950/90 backdrop-blur-3xl p-6 md:p-14 rounded-[2.5rem] md:rounded-[4.5rem] transition-all hover:bg-slate-950 flex flex-col justify-between shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden border-2 aspect-square md:aspect-auto md:min-h-[480px] ${
      isFixed ? 'border-[#c0a060]/40 hover:border-[#c0a060] shadow-[#c0a060]/10' : 'border-white/10 hover:border-white/20 shadow-white/5'
    } ${!isPlaceholder ? 'hover:-translate-y-4' : 'opacity-95 hover:opacity-100 hover:scale-[1.01]'}`}>
      
      {/* Decorative Glow */}
      <div className={`absolute -top-48 -right-48 w-96 h-96 blur-[150px] transition-opacity duration-1000 opacity-10 group-hover:opacity-20 ${
        isFixed ? 'bg-accent-gold' : 'bg-white'
      }`} />

      <div className="relative flex flex-col h-full justify-between pb-6 md:pb-8">
        <div className="flex items-center justify-between">
          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[1.4rem] md:rounded-[1.8rem] border-2 flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-12 ${
            isFixed ? 'bg-accent-gold/20 border-accent-gold/40' : 'bg-white/10 border-white/20'
          }`}>
            <Trophy className={`w-8 h-8 md:w-10 md:h-10 ${isFixed ? 'text-accent-gold' : 'text-slate-400'}`} />
          </div>
          
          {!isPlaceholder && (
            <div className="flex flex-col items-end gap-1 md:gap-2">
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Ocupación</span>
              <div className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 md:py-3.5 rounded-xl md:rounded-[1.2rem] bg-black/60 border-2 border-white/5 text-white font-black text-xs md:text-lg shadow-inner overflow-hidden relative">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 relative z-10" />
                <span className="relative z-10">
                  <span className="text-emerald-400">{(room.metadata as any)?.activePlayers ?? room.clients}</span>
                  <span className="text-slate-600 mx-1.5 md:mx-2">/</span>
                  {room.maxClients || 7}
                </span>
                <div 
                  className="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-1000" 
                  style={{ width: `${(((room.metadata as any)?.activePlayers ?? room.clients) / (room.maxClients || 7)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isAdmin && !isPlaceholder && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(room.roomId); }}
              className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ml-auto active:scale-95 shadow-2xl shadow-red-500/20"
              title="Cerrar Mesa"
            >
              <Zap className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="mt-auto pt-4 md:pt-0">
          <h3 className={`text-3xl md:text-6xl font-display font-black transition-colors uppercase italic tracking-tighter leading-[0.9] pr-2 break-words ${
            isFixed ? 'text-white group-hover:text-accent-gold text-accent-gold-shimmer' : 'text-slate-200 group-hover:text-white'
          }`}>
            {(room.metadata as any)?.tableName || "Mesa VIP"}
          </h3>
          
          <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-6">
            <div className={`w-3.5 h-3.5 rounded-full ${isPlaceholder ? 'bg-slate-700' : 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]'}`} />
            <p className="text-slate-500 text-xs font-black uppercase tracking-[0.5em] pt-0.5 opacity-60">
              {isPlaceholder ? 'ESTADO: DISPONIBLE' : `REF: ${room.roomId.substring(0, 8)}`}
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleAction}
        disabled={!isPlaceholder && (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7)}
        className={`relative mt-12 md:mt-16 w-full h-20 md:h-28 font-display font-black uppercase italic tracking-[0.15em] md:tracking-[0.25em] text-2xl md:text-3xl rounded-[1.8rem] md:rounded-[2.2rem] transition-all flex items-center justify-center shadow-2xl border-t-2 border-b-[6px] md:border-b-[8px] border-x-2 ${
          !isPlaceholder && (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7)
            ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
            : isFixed 
              ? "bg-accent-gold-shimmer border-t-white/40 border-b-black/70 border-x-white/20 text-slate-950 hover:scale-[1.03] active:translate-y-2 active:border-b-[4px] shadow-[#c0a060]/40 hover:shadow-[#c0a060]/70"
              : "bg-slate-800 border-t-white/10 border-b-black/80 border-x-white/5 text-white hover:bg-slate-700 hover:scale-[1.03] active:translate-y-2 active:border-b-[4px]"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:animate-shimmer pointer-events-none" />
        {isPlaceholder ? "ABRIR MESA" : (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7) ? "MESA LLENA" : "ENTRAR"}
      </button>
    </div>
  )
}
