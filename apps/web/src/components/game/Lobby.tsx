"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { client } from '@/lib/colyseus'
import { RoomAvailable, Room } from '@colyseus/sdk'
import { useRouter } from 'next/navigation'
import { Plus, Users, Zap, Trophy, Shield, RefreshCcw, AlertCircle } from 'lucide-react'

export function Lobby() {
  const [rooms, setRooms] = useState<RoomAvailable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const lobbyRoomRef = useRef<Room | null>(null)

  const connectToLobby = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Si ya hay una conexión, la cerramos antes de re-conectar
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
    connectToLobby()
    return () => {
      if (lobbyRoomRef.current) {
        lobbyRoomRef.current.leave()
      }
    }
  }, [connectToLobby])

  const createTable = async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const room = await client.create("mesa", { 
        tableName: `Mesa Real #${Math.floor(Math.random() * 999)}`,
        maxPlayers: 7
      })
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

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">
            <div className={`w-2 h-2 rounded-full ${lobbyRoomRef.current ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {lobbyRoomRef.current ? 'Servidor Operativo' : 'Desconectado'}
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.9]">
            Mesa<br />
            <span className="bg-gradient-to-r from-white via-slate-400 to-slate-600 bg-clip-text text-transparent">Privada</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-wide">
            Únete a una mesa existente o crea tu propio salón de juego.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={createTable}
            disabled={creating}
            className="group relative h-20 px-10 bg-white text-slate-950 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 transition-all hover:bg-emerald-500 hover:text-white hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
          >
            {creating ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            )}
            {creating ? "Iniciando..." : "Nueva Mesa"}
          </button>
          
          <button 
            onClick={connectToLobby}
            className="h-14 px-6 bg-slate-900 border border-white/5 text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            <RefreshCcw className="w-3 h-3" />
            Reconectar
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-3xl flex items-center gap-4 text-red-400 animate-in zoom-in duration-300">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* Mesas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && !rooms.length ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-[3rem] bg-white/5 animate-pulse border border-white/5" />
          ))
        ) : rooms.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-6 opacity-40">
            <Zap className="w-16 h-16 text-slate-700" />
            <div className="text-center space-y-2">
              <p className="text-xl font-black uppercase tracking-widest text-slate-500">Bóveda Vacía</p>
              <p className="text-sm text-slate-600">No hay mesas activas en esta frecuencia.</p>
            </div>
          </div>
        ) : (
          rooms.map((room) => (
            <div 
              key={room.roomId}
              className="group relative backdrop-blur-3xl bg-slate-900/40 border border-white/5 p-10 rounded-[3.5rem] transition-all hover:bg-slate-900/80 hover:border-emerald-500/30 hover:-translate-y-3 flex flex-col justify-between shadow-2xl overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[100px] group-hover:bg-emerald-500/20 transition-all" />

              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Trophy className="w-7 h-7 text-emerald-400/80" />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 border border-white/10 text-white font-black text-xs">
                    <Users className="w-4 h-4 text-emerald-400" />
                    {room.clients}<span className="text-slate-600">/</span>{room.maxClients || 7}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors uppercase italic tracking-tighter leading-none">
                    {(room.metadata as any)?.tableName || "Mesa VIP Royal"}
                  </h3>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">ID: {room.roomId.substring(0, 12)}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => joinTable(room.roomId)}
                className="relative mt-10 w-full h-16 bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all hover:bg-white hover:text-slate-950 active:scale-95 overflow-hidden"
              >
                Acceder a la Mesa
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
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
    </div>
  )
}
