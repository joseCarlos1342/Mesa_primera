'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { Room } from '@colyseus/sdk'
import { Loader2, ArrowLeft, Users, Gamepad2, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useWakeLock } from '../../../../hooks/useWakeLock'
import { Board } from '../../../components/game/Board'
import { RulesModal } from '@/components/game/RulesModal'
import { ReconnectOverlay } from '@/components/game/ReconnectOverlay'
import { VoiceChat } from '@/components/VoiceChat'

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  // Game State
  const [gameState, setGameState] = useState({
    players: [] as any[],
    phase: 'LOBBY',
    pot: 0,
    dealerId: '',
    countdown: -1
  })
  
  const hasAttemptedJoin = useRef(false)
  
  // Mantiene la pantalla encendida en móviles
  useWakeLock()

  useEffect(() => {
    if (!roomId) return;
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    async function joinRoom() {
      try {
        console.log(`Connecting to room ${roomId}...`);
        
        let joinedRoom: Room | undefined;
        const tokenKey = `reconnectionToken_${roomId}`;
        const nickKey = `nickname_${roomId}`;
        
        const savedToken = sessionStorage.getItem(tokenKey);
        let nick = sessionStorage.getItem(nickKey);
        
        if (savedToken) {
          try {
            console.log("Token de reconexión encontrado, intentando reconectar...");
            joinedRoom = await client.reconnect(savedToken);
            console.log("Reconectado exitosamente a la silla original!");
          } catch (e) {
            console.warn("Fallo al reconectar, intentando entrar como nuevo jugador...", e);
            sessionStorage.removeItem(tokenKey);
          }
        }
        
        if (!joinedRoom) {
          // Sync with Supabase session first
          let avatarUrl = sessionStorage.getItem(`avatarUrl_${roomId}`)
          if (!nick) {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.username) {
              nick = user.user_metadata.username
              sessionStorage.setItem(nickKey, nick!)
              if (user.user_metadata.avatar_url) {
                avatarUrl = user.user_metadata.avatar_url
                sessionStorage.setItem(`avatarUrl_${roomId}`, avatarUrl)
              }
            }
          }

          if (!nick) {
            nick = 'Jugador ' + Math.floor(Math.random() * 1000);
            sessionStorage.setItem(nickKey, nick);
          }
          
          let deviceId = localStorage.getItem('deviceId');
          if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('deviceId', deviceId);
          }

          joinedRoom = await client.joinById(roomId, {
            nickname: nick,
            deviceId: deviceId,
            avatarUrl: avatarUrl
          })
          
          // Guardar el token para permitir reconexiones si se recarga la página (F5)
          sessionStorage.setItem(tokenKey, joinedRoom.reconnectionToken);
        }
        
        console.log('Joined room:', joinedRoom)
        setRoom(joinedRoom)

        joinedRoom.onLeave((code) => {
          console.warn('Left room with code', code)
          if (code !== 1000) {
            setIsReconnecting(true);
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
        })

        joinedRoom.onError((code, message) => {
          console.error(`Colyseus Error [${code}]:`, message)
          setError(message || 'Ocurrió un error inesperado al conectar al servidor.')
        })

        // State Listeners
        joinedRoom.onStateChange((state: any) => {
          // Convert MapSchema to Array for React rendering
          const playersArray: any[] = []
          state.players.forEach((player: any) => {
            // Hide disconnected or ghost players while in LOBBY so they don't take up visual seats
            if (state.phase === 'LOBBY' && !player.connected) return;
            playersArray.push(player);
          })
          
          setGameState({
            phase: state.phase,
            pot: state.pot,
            dealerId: state.dealerId,
            countdown: state.countdown,
            players: playersArray
          })
        })

      } catch (err: any) {
        console.error('Join Error:', err)
        setError(err.message || 'Error al conectar con la sala')
        // Si la sala no existe, redirigir al lobby después de unos segundos
        if (err.message?.includes('not found')) {
          setTimeout(() => {
            window.location.href = '/'
          }, 3000)
        }
      } finally {
        setLoading(false)
      }
    }

    joinRoom()

    return () => {
      // Si el componente se desmonta porque el usuario navegó a otra página (Lobby),
      // queremos hacer un "Consented Leave" para que se libere el espacio inmediatamente en Colyseus
      // y la sala no se bloquee o se llene de fantasmas.
      if (room) {
        // En Colyseus, leave(true) es consented, lo que remueve al jugador enseguida.
        room.leave(true);
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

  const { players, phase, pot, dealerId, countdown } = gameState;

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
        
        <div className="flex gap-4 items-center">
           <button 
             onClick={() => setShowRules(true)} 
             className="p-2 bg-[#1b253b]/50 hover:bg-[#1b253b] text-emerald-400 rounded-xl transition-colors border border-emerald-500/20"
             title="Reglamento"
           >
              <BookOpen className="w-5 h-5 mx-auto" />
           </button>
        </div>
      </header>
      
      {/* MAIN GAME AREA */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-0 p-0 m-0 overflow-hidden">
        {phase === 'LOBBY' ? (
          <div className="relative text-center w-full h-full flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <Users className="w-24 h-24 mx-auto text-emerald-500/50 mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Sala de Espera</h2>
            <p className="text-lg text-[#8b98b8] mb-8">
              Jugadores conectados: <span className="text-white font-bold">{players.length}</span> / 7
            </p>
            {players.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto z-10 relative">
                {players.map(p => {
                  const isMe = room?.sessionId === p.id;
                  return (
                    <div key={p.id} className={`border ${p.isReady ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[#1b253b]/50 border-slate-500/20'} rounded-full px-6 py-3 flex items-center gap-3 transition-colors`}>
                      <div className={`w-3 h-3 rounded-full ${p.isReady ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'} ${isMe ? 'animate-pulse' : ''}`} />
                      <span className={`${p.isReady ? 'text-white' : 'text-slate-300'} font-medium`}>
                        {p.nickname} {isMe ? '(Tú)' : ''}
                      </span>
                      <span className="text-[#8b98b8] text-sm ml-2 font-mono">${p.chips}</span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {room && (
              <div className="mt-12 z-10 relative flex flex-col items-center">
                <button 
                  onClick={() => {
                    const me = players.find(p => p.id === room.sessionId);
                    if (me) {
                      room.send('toggleReady', { isReady: !me.isReady });
                    }
                  }}
                  className={`font-black px-10 py-5 rounded-full uppercase tracking-widest transition-all shadow-lg ${
                    players.find(p => p.id === room?.sessionId)?.isReady 
                      ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500/30' 
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {players.find(p => p.id === room?.sessionId)?.isReady ? 'Anular Listo' : '¡Estoy Listo!'}
                </button>
                
                {players.length < 3 && (
                  <p className="mt-6 text-emerald-500/50 animate-pulse uppercase tracking-widest text-sm font-bold">
                    Esperando al menos 3 jugadores...
                  </p>
                )}
                
                {players.length >= 3 && players.filter(p => p.isReady).length < 3 && (
                  <p className="mt-6 text-emerald-500/80 uppercase tracking-widest text-sm font-bold">
                    Esperando que al menos 3 estén listos ({players.filter(p => p.isReady).length}/3)
                  </p>
                )}
                
                {countdown > 0 && countdown <= 60 && (
                   <div className="mt-6 flex flex-col items-center gap-2">
                     <p className="text-emerald-400 font-bold tracking-widest uppercase">
                       Iniciando en: <span className="text-white text-2xl ml-2 font-black">{countdown}s</span>
                     </p>
                     <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                          style={{ width: `${(countdown / 60) * 100}%` }}
                        />
                     </div>
                   </div>
                )}

                {players.filter(p => p.isReady).length >= 3 && (
                  dealerId === room.sessionId ? (
                    <button 
                      onClick={() => room.send('startGame')}
                      className="mt-6 bg-emerald-500 text-slate-950 font-black px-8 py-4 rounded-full uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-[0_0_30px_rgba(16,185,129,0.3)] z-10 relative"
                    >
                      {countdown > 0 ? 'Forzar Inicio Ahora' : 'Iniciar Partida'}
                    </button>
                  ) : (
                    <p className="mt-6 text-emerald-400/70 animate-pulse uppercase tracking-widest text-sm font-bold">
                      {countdown > 0 ? 'Cargando mesa...' : 'Esperando al anfitrión...'}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <Board room={room} phase={phase} players={players} pot={pot} />
        )}
        
        {/* Voice Chat Component */}
        {room && (
          <div className="absolute bottom-6 left-6 z-50">
             <VoiceChat 
                roomName={roomId} 
                username={players.find(p => p.id === room?.sessionId)?.nickname || 'Jugador'} 
             />
          </div>
        )}
      </main>

      {/* FOOTER - Solo visible en LOBBY para maximizar espacio de mesa en móviles */}
      {phase === 'LOBBY' && (
        <footer className="h-14 border-t border-[#1b253b] bg-[#0c1220]/80 flex items-center justify-between px-8 text-sm backdrop-blur-md relative z-10 pb-safe">
          <div className="flex items-center gap-2 text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Conectado
          </div>
        </footer>
      )}

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ReconnectOverlay isVisible={isReconnecting} />
    </div>
  )
}
