"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { RoomAvailable, Room } from '@colyseus/sdk'
import { useRouter } from 'next/navigation'
import { Plus, Users, Zap, Trophy, Shield, RefreshCcw, Film } from 'lucide-react'
import { motion } from 'framer-motion'
import { DepositModal } from '@/components/game/DepositModal'
import Link from 'next/link'

export function Lobby() {
  const [rooms, setRooms] = useState<RoomAvailable[]>([])
  const [_loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)
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
            balance: wallet ? wallet.balance_cents / 100 : 0,
            balance_cents: wallet ? wallet.balance_cents : 0
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
        const roomId = reconnectionTokenKey.replace('reconnectionToken_', '');
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

    // VALIDACIÓN DE SALDO MÍNIMO ($50,000)
    const balance = userProfile?.balance_cents || 0;
    if (balance < 5000000) { // 50,000 * 100 (cents) = 5,000,000
      setError("Fondos insuficientes. Se requiere un saldo mínimo de $50,000 para abrir una mesa. Por favor, recargue su cuenta.");
      setShowDeposit(true);
      return;
    }

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
        avatarUrl: avatarUrl,
        chips: userProfile?.balance_cents || 0
      })

      sessionStorage.setItem(`reconnectionToken_${room.roomId}`, room.reconnectionToken);
      sessionStorage.setItem(`nickname_${room.roomId}`, nick);

      if (room.connection?.transport?.close) {
        room.connection.transport.close();
      } else {
        try { (room.connection as any).close(); } catch { /* ignore */ }
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
      <div className="w-full max-w-7xl mx-auto p-4 md:p-12 space-y-12 pb-0 md:pb-24">
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
        <header className="flex flex-col items-center justify-center gap-6 md:gap-12 pb-8 md:pb-20 relative px-4">
          {/* 1. Server Status & Tables - Larger and Primary */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-4 px-8 py-3 bg-brand-gold/5 border-2 border-brand-gold/20 rounded-full backdrop-blur-xl shadow-[0_0_30px_rgba(197,160,89,0.1)]"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] md:text-xs font-black text-brand-gold uppercase tracking-[0.4em]">SERVIDOR ACTIVO</span>
            <div className="w-px h-4 bg-brand-gold/20 mx-1" />
            <span className="text-[10px] md:text-xs font-black text-text-premium uppercase tracking-[0.2em]">
              {rooms.length} MESAS DISPONIBLES
            </span>
          </motion.div>

          {/* 2. Main Title & Subtitle - Impactful Size */}
          <div className="flex flex-col items-center space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl md:text-9xl lg:text-[10rem] font-display font-black italic text-brand-gold uppercase tracking-tighter leading-[0.75] pr-4 drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
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
              className="flex flex-col md:flex-row items-center gap-6 md:gap-10 px-8 md:px-12 py-6 rounded-[3rem] bg-black/40 backdrop-blur-3xl border-2 border-brand-gold/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all hover:border-brand-gold/30"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-brand-gold group-hover:text-brand-gold-light transition-colors mb-2">Mi Balance</span>
                <span className="text-6xl md:text-7xl font-black text-text-premium tracking-tighter leading-none flex items-center drop-shadow-premium">
                  <span className="text-brand-gold mr-2 opacity-90">$</span>
                  {userProfile.balance?.toLocaleString() || '0'}
                </span>
              </div>
              <button
                onClick={() => setShowDeposit(true)}
                className="w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-accent-gold-shimmer flex items-center justify-center shadow-xl hover:scale-105 transition-all active:translate-y-1 active:shadow-inner group/btn relative overflow-hidden border-b-4 border-black/30"
                title="Cargar Saldo"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                <Plus className="w-7 h-7 md:w-9 md:h-9 text-slate-950 stroke-[4] relative z-10" />
              </button>
              <Link
                href="/replays"
                className="w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-purple-600 flex items-center justify-center shadow-xl hover:scale-105 transition-all active:translate-y-1 active:shadow-inner group/btn relative overflow-hidden border-b-4 border-purple-900/50"
                title="Repeticiones"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                <Film className="w-7 h-7 md:w-9 md:h-9 text-white stroke-[2.5] relative z-10" />
              </Link>
            </motion.div>
          )}

          {/* Floating Admin Actions - Offset to not interfere with main flow */}
          {isAdmin && (
            <div className="absolute top-8 right-8">
              <button
                onClick={createTable}
                disabled={creating}
                className="group relative h-20 w-20 bg-brand-gold text-slate-950 rounded-[2.5rem] font-black flex items-center justify-center transition-all hover:scale-105 active:translate-y-1 active:shadow-inner disabled:opacity-50 shadow-premium border-b-4 border-black/30"
                title="Nueva Mesa"
              >
                <Plus className="w-8 h-8 transition-transform group-hover:rotate-90" />
              </button>
            </div>
          )}
        </header>

        {/* Main Content Area - Anchored with Premium Table Container */}
        <div className="relative p-5 md:p-16 lg:p-20 bg-black/40 backdrop-blur-3xl rounded-[3rem] md:rounded-[5rem] border-2 border-brand-gold/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden min-h-[400px] md:min-h-[800px] w-full max-w-full">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[150px] -mr-64 -mt-64 opacity-60" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[150px] -ml-64 -mb-64 opacity-30" />
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('/textures/noise.png')] mix-blend-overlay" />

          <div className="relative z-10 space-y-12 md:space-y-20">
            {/* Mesas Principales */}
            <div className="space-y-8 md:space-y-12">
              <div className="flex flex-col items-center space-y-1">
                <h2 className="text-3xl md:text-4xl font-display font-black italic uppercase text-text-premium tracking-widest drop-shadow-premium">Mesas</h2>
                <div className="h-1 w-16 md:w-20 bg-brand-gold/40 rounded-full" />
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
                    userProfile={userProfile}
                  />
                ))}
              </div>
            </div>

            {/* Otras Mesas */}
            {otherTables.length > 0 && (
              <div className="space-y-12 pt-20 border-t-2 border-white/5">
                <div className="flex flex-col items-center space-y-1">
                  <h2 className="text-3xl md:text-4xl font-display font-black italic uppercase text-slate-400 tracking-widest">Mesas</h2>
                  <div className="h-1 w-16 md:w-20 bg-white/10 rounded-full" />
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
                      userProfile={userProfile}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Bottom info - Enhanced for Accessibility */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 pt-4 md:pt-24 pb-4 border-t-2 border-brand-gold/10 opacity-60 w-full overflow-hidden">
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-slate-500">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-brand-gold/60" /> Seguridad de Élite
          </div>
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-slate-500">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-brand-gold/60" /> Juego Auditado
          </div>
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-slate-500">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-brand-gold/60" /> Conexión Blindada
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

function TableCard({ room, isAdmin, onJoin, onDelete, isFixed, creating, setCreating, userProfile }: {
  room: any,
  isAdmin: boolean,
  onJoin: (id: string) => void,
  onDelete: (id: string) => void,
  isFixed: boolean,
  creating: boolean,
  setCreating: (v: boolean) => void,
  userProfile: any
}) {
  const isPlaceholder = room.metadata?.isPlaceholder;

  const handleAction = async () => {
    // VALIDACIÓN DE SALDO MÍNIMO ($50,000)
    const balance = userProfile?.balance_cents || 0;
    if (balance < 5000000) {
      alert("Fondos insuficientes. Se requiere un saldo mínimo de $50,000 para entrar a una mesa. Por favor, recargue su cuenta.");
      return;
    }

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
          avatarUrl: avatarUrl,
          chips: userProfile?.balance_cents || 0
        });

        sessionStorage.setItem(`reconnectionToken_${newRoom.roomId}`, newRoom.reconnectionToken);
        sessionStorage.setItem(`nickname_${newRoom.roomId}`, nick);

        if (newRoom.connection?.transport?.close) {
          newRoom.connection.transport.close();
        } else {
          try { (newRoom.connection as any).close(); } catch { /* ignore */ }
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

  const tableName = (room.metadata as any)?.tableName || "Mesa VIP";
  const displayTitle = tableName.toUpperCase().replace(/MESA\s*/i, "").trim();

  return (
    <div className={`group relative bg-black/40 backdrop-blur-3xl p-5 md:p-14 rounded-[2.5rem] md:rounded-[4.5rem] transition-all hover:bg-black/60 flex flex-col justify-between shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden border-2 md:aspect-auto md:min-h-[480px] w-full max-w-full ${isFixed ? 'border-brand-gold/20 hover:border-brand-gold/40 shadow-brand-gold/5' : 'border-white/5 hover:border-brand-gold/10 shadow-white/5'
      } ${!isPlaceholder ? 'hover:-translate-y-4' : 'opacity-95 hover:opacity-100 hover:scale-[1.01]'}`}>

      {/* Decorative Glow */}
      <div className={`absolute -top-48 -right-48 w-96 h-96 blur-[150px] transition-opacity duration-1000 opacity-10 group-hover:opacity-20 ${isFixed ? 'bg-brand-gold' : 'bg-white'
        }`} />

      <div className="relative flex flex-col h-full gap-6 md:gap-10 pb-4 md:pb-10">
        {/* Top Indicators Row */}
        <div className="flex items-center justify-center md:justify-between w-full">
          <div className="flex items-center gap-3 md:gap-5">
            <div className={`shrink-0 w-12 h-12 md:w-20 md:h-20 rounded-[1.2rem] md:rounded-[1.8rem] border-2 flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-12 ${isFixed ? 'bg-brand-gold/10 border-brand-gold/20' : 'bg-white/5 border-white/10'
              }`}>
              <Trophy className={`w-6 h-6 md:w-10 md:h-10 ${isFixed ? 'text-brand-gold' : 'text-slate-600'}`} />
            </div>

            {!isPlaceholder && (
              <div className="flex flex-col gap-1 md:gap-2">
                <span className="text-[7px] md:text-[11px] font-black uppercase tracking-[0.3em] text-slate-500/60 leading-none">Ocupación</span>
                <div className="flex items-center gap-1.5 md:gap-3 px-3 md:px-6 py-1.5 md:py-3 rounded-lg md:rounded-2xl bg-black/60 border border-white/5 text-white font-black text-[10px] md:text-lg shadow-inner overflow-hidden relative">
                  <Users className="w-3 h-3 md:w-5 md:h-5 text-emerald-400 relative z-10" />
                  <span className="relative z-10 lining-nums">
                    <span className="text-emerald-400">{(room.metadata as any)?.activePlayers ?? room.clients}</span>
                    <span className="text-slate-600 mx-1 md:mx-2">/</span>
                    {room.maxClients || 7}
                  </span>
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500/10 transition-all duration-1000"
                    style={{ width: `${(((room.metadata as any)?.activePlayers ?? room.clients) / (room.maxClients || 7)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {isAdmin && !isPlaceholder && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(room.roomId); }}
              className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-xl shadow-red-500/10"
              title="Cerrar Mesa"
            >
              <Zap className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          )}
        </div>

        {/* Identity & Status Tag Region */}
        <div className="flex flex-col gap-1 md:gap-3 items-center md:items-start w-full">
          <div className="flex items-center justify-center md:justify-start w-full px-2">
            <span className="text-slate-500 text-[11px] md:text-base font-black uppercase tracking-[0.3em] md:tracking-[0.5em] opacity-40 whitespace-nowrap">
              {isPlaceholder ? 'MESA RESERVADA' : `REF: ${room.roomId.substring(0, 8)}`}
            </span>
          </div>

          <h3 className={`text-6xl md:text-9xl font-display font-black transition-colors uppercase italic tracking-tighter leading-none text-center md:text-left w-full pr-0 md:pr-12 ${isFixed ? 'text-text-premium group-hover:text-brand-gold' : 'text-slate-400 group-hover:text-text-premium'
            }`}>
            {displayTitle}
          </h3>
        </div>
      </div>

      <button
        onClick={handleAction}
        disabled={!isPlaceholder && (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7)}
        className={`relative mt-2 md:mt-4 w-full h-16 md:h-24 font-display font-black uppercase italic tracking-[0.2em] text-lg md:text-2xl rounded-[1.5rem] md:rounded-[2rem] transition-all flex items-center justify-center overflow-hidden ${!isPlaceholder && (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7)
            ? "bg-slate-900 text-slate-600 cursor-not-allowed"
            : isFixed
              ? "bg-brand-gold text-slate-950 hover:brightness-110"
              : "bg-slate-900 text-text-premium hover:bg-slate-800"
          }`}
      >
        {isFixed && !(!isPlaceholder && (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7)) && (
          <div className="absolute inset-0 bg-accent-gold-shimmer opacity-100" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
        <span className="relative z-10">
          {isPlaceholder ? "ABRIR MESA" : (room.metadata as any)?.totalReservedSeats >= (room.maxClients || 7) ? "MESA LLENA" : "ENTRAR"}
        </span>
      </button>
    </div>
  )
}
