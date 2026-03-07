'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { client } from '@/lib/colyseus'
import { Room } from '@colyseus/sdk'
import { Loader2, ArrowLeft, Users, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  const hasAttemptedJoin = useRef(false)

  useEffect(() => {
    if (!roomId) return;
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    async function joinRoom() {
      try {
        console.log(`Connecting to room ${roomId}...`);
        // Ojo: En desarrollo, usamos el displayName, o un auto-ID
        const joinedRoom = await client.joinById(roomId, {
          nickname: 'Jugador ' + Math.floor(Math.random() * 1000)
        })
        
        console.log('Joined room:', joinedRoom)
        setRoom(joinedRoom)

        joinedRoom.onLeave((code) => {
          console.warn('Left room with code', code)
          if (code !== 1000) {
            setError('Desconectado de la sala')
          }
        })

        joinedRoom.onError((code, message) => {
          console.error(`Colyseus Error [${code}]:`, message)
          setError(message)
        })

      } catch (err: any) {
        console.error('Join Error:', err)
        setError(err.message || 'Error al conectar con la sala')
      } finally {
        setLoading(false)
      }
    }

    joinRoom()

    return () => {
      if (room) {
        room.leave()
      }
    }
  }, [roomId]) // solo lo ejecutamos una vez, por eso hasAttemptedJoin

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#070b14] text-white">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
        <h2 className="text-xl font-medium tracking-widest text-[#a8b2d1]">CONECTANDO A LA MESA...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#070b14] text-white p-6 text-center">
        <div className="bg-red-950/30 border border-red-500/50 p-8 rounded-2xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error de Conexión</h2>
          <p className="text-[#a8b2d1] mb-8">{error}</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-[#1b253b] hover:bg-[#25324d] px-6 py-3 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5" />
            Vuelve al Lobby
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#070b14] text-[#a8b2d1] font-sans selection:bg-emerald-500/30 relative overflow-hidden">
      {/* HEADER */}
      <header className="flex h-20 items-center justify-between border-b border-[#1b253b] bg-[#0c1220]/80 px-8 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/')}
            className="group flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b253b]/50 text-[#8b98b8] transition-all hover:bg-[#1b253b] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-3">
              Mesa Primera
              <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">
                {roomId}
              </span>
            </h1>
          </div>
        </div>
        
        <div className="flex gap-4">
           {/* Info del jugador */}
        </div>
      </header>
      
      {/* MAIN GAME AREA */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-0">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative text-center">
            <Gamepad2 className="w-24 h-24 mx-auto text-emerald-500/50 mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Esperando Jugadores</h2>
            <p className="text-lg text-[#8b98b8]">La partida comenzará prono...</p>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-16 border-t border-[#1b253b] bg-[#0c1220]/80 flex items-center justify-between px-8 text-sm">
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          Conectado
        </div>
      </footer>
    </div>
  )
}
