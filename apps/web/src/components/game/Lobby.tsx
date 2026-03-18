"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { RoomAvailable, Room } from '@colyseus/sdk'
import { useRouter } from 'next/navigation'
import { Plus, Users, Zap, Trophy, Shield, RefreshCcw, AlertCircle } from 'lucide-react'
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

      const room = await client.create("mesa", { 
        tableName: `Mesa #${rooms.length + 1}`,
        maxPlayers: 7,
        nickname: nick,
        deviceId: deviceId
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
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {reconnecting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="relative">
             <div className="absolute inset-0 bg-emerald-500/20 blur-3xl animate-pulse" />
             <RefreshCcw className="relative w-24 h-24 text-emerald-500 animate-spin mb-8" />
           </div>
           <h2 className="text-4xl font-black uppercase tracking-[0.4em] text-white italic animate-pulse">Reconectando</h2>
           <p className="text-slate-400 font-bold tracking-widest uppercase text-xs mt-4 opacity-50">Restaurando tu sesión en la mesa...</p>
        </div>
      )}

      {/* Ultra Minimal Header - Redesigned for better flow */}
      <div className="flex flex-row items-center justify-between gap-4 pb-8 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="h-10 px-4 rounded-xl bg-slate-900/50 border border-white/5 flex items-center gap-2 shadow-inner">
            <div className={`w-1.5 h-1.5 rounded-full ${lobbyRoomRef.current ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {lobbyRoomRef.current ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userProfile && (
            <div className="flex items-center gap-4 h-14 pl-5 pr-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 shadow-2xl group transition-all hover:border-emerald-500/30">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/50 group-hover:text-emerald-500 transition-colors">Billetera</span>
                <span className="text-xl font-black text-white tracking-tighter leading-none">
                  <span className="text-emerald-500 mr-0.5">$</span>
                  {userProfile.balance?.toLocaleString() || '0'}
                </span>
              </div>
              <button 
                onClick={() => setShowDeposit(true)}
                className="w-10 h-10 rounded-xl bg-emerald-600 border border-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all active:scale-95 group-active:rotate-90 hover:bg-emerald-500"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {isAdmin && (
            <button 
              onClick={createTable}
              disabled={creating}
              className="group relative h-14 w-14 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center transition-all hover:bg-emerald-500 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl"
              title="Nueva Mesa"
            >
              <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
            </button>
          )}
        </div>
      </div>

      {/* Mesas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

      {/* Otras Mesas */}
      {otherTables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8 border-t border-white/5">
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
      )}

      {/* Bottom info */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 opacity-20 pt-10 border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <Shield className="w-3 h-3" /> Encriptación Militar
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <Shield className="w-3 h-3" /> RNG Auditado
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
          <Shield className="w-3 h-3" /> Conexión Segura
        </div>
      </div>

      <DepositModal 
        isOpen={showDeposit} 
        onClose={() => setShowDeposit(false)} 
      />
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
        localStorage.setItem('nickname', nick);
        localStorage.setItem('deviceId', deviceId);

        const newRoom = await client.create("mesa", { 
          tableName: room.metadata.tableName,
          maxPlayers: 7,
          nickname: nick,
          deviceId: deviceId
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
    <div className={`group relative backdrop-blur-3xl bg-slate-900/40 border p-10 rounded-[3.5rem] transition-all hover:bg-slate-900/80 flex flex-col justify-between shadow-2xl overflow-hidden ${
      isFixed ? 'border-emerald-500/20' : 'border-white/5'
    } ${!isPlaceholder ? 'hover:border-emerald-500/30 hover:-translate-y-3' : 'opacity-80 hover:opacity-100'}`}>
      <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[100px] transition-all ${
        isFixed ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-slate-500/5 group-hover:bg-slate-500/10'
      }`} />

      <div className="relative space-y-6">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${
            isFixed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'
          }`}>
            <Trophy className={`w-7 h-7 ${isFixed ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          
          {!isPlaceholder && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 border border-white/10 text-white font-black text-xs">
              <Users className="w-4 h-4 text-emerald-400" />
              {(room.metadata as any)?.activePlayers ?? room.clients}<span className="text-slate-600">/</span>{room.maxClients || 7}
            </div>
          )}

          {isAdmin && !isPlaceholder && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(room.roomId); }}
              className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ml-auto"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div>
          <h3 className={`text-3xl font-black transition-colors uppercase italic tracking-tighter leading-none ${
            isFixed ? 'text-white group-hover:text-emerald-300' : 'text-slate-200 group-hover:text-white'
          }`}>
            {(room.metadata as any)?.tableName || "Mesa VIP"}
          </h3>
          
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${isPlaceholder ? 'bg-slate-700' : 'bg-emerald-500 animate-pulse'}`} />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">
              {isPlaceholder ? 'SALA DISPONIBLE' : `ID: ${room.roomId.substring(0, 12)}`}
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleAction}
        disabled={!isPlaceholder && (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7)}
        className={`relative mt-8 w-full h-20 font-black uppercase tracking-[0.2em] text-lg rounded-[1.5rem] transition-all flex items-center justify-center shadow-lg ${
          !isPlaceholder && (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7)
            ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
            : isFixed 
              ? "bg-emerald-600 border border-emerald-400 text-white hover:bg-emerald-500 hover:scale-105"
              : "bg-slate-800 border border-white/5 text-white hover:bg-slate-700 hover:scale-105"
        }`}
      >
        {isPlaceholder ? "ABRIR MESA" : (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7) ? "MESA LLENA" : "ENTRAR"}
      </button>
    </div>
  )
}
