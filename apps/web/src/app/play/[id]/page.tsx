'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { Room } from '@colyseus/sdk'
import { Loader2, ArrowLeft, Users, Gamepad2, BookOpen, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useWakeLock } from '../../../../hooks/useWakeLock'
import { Board } from '../../../components/game/Board'
import { RulesModal } from '@/components/game/RulesModal'
import { ReconnectOverlay } from '@/components/game/ReconnectOverlay'
import { VoiceChat } from '@/components/VoiceChat'
import { GameHeader } from '@/components/game/game-header'
import { DepositModal } from '@/components/game/DepositModal'

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
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

  // Listen to open-recharge-modal and open-rules-modal events
  useEffect(() => {
    const handleOpenDeposit = () => setShowDeposit(true)
    const handleOpenRules = () => setShowRules(true)
    
    window.addEventListener('open-recharge-modal', handleOpenDeposit)
    window.addEventListener('open-rules-modal', handleOpenRules)
    
    return () => {
      window.removeEventListener('open-recharge-modal', handleOpenDeposit)
      window.removeEventListener('open-rules-modal', handleOpenRules)
    }
  }, [])

  useEffect(() => {
    if (!roomId) return;
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    let activeRoom: Room | undefined;
    
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
          let avatarUrl = sessionStorage.getItem(`avatarUrl_${roomId}`);
          if (!avatarUrl) {
            avatarUrl = localStorage.getItem('avatarUrl') || 'as-oros';
          }
          
          if (!nick) {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.username) {
              nick = user.user_metadata.username
              sessionStorage.setItem(nickKey, nick!)
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
        
        activeRoom = joinedRoom;
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
      } finally {
        setLoading(false)
      }
    }

    joinRoom()

    return () => {
      // Si el componente se desmonta porque el usuario navegó a otra página (Lobby)
      if (activeRoom) {
        sessionStorage.removeItem(`reconnectionToken_${roomId}`);
        activeRoom.leave(true);
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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-black to-[#0a0a0a] text-[#f3edd7] p-6 text-center">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 bg-black/60 backdrop-blur-2xl border-2 border-red-900/50 p-10 rounded-3xl max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-900 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(231,76,60,0.4)] border border-red-400/30">
             <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black font-display text-[#e74c3c] uppercase tracking-widest mb-4 drop-shadow-premium">Error de Conexión</h2>
          <p className="text-[#a0a0b0] mb-8 text-sm md:text-base leading-relaxed">{error}</p>
          <button 
            onClick={() => {
              sessionStorage.removeItem(`reconnectionToken_${roomId}`);
              router.push('/');
            }}
            className="inline-flex items-center justify-center gap-3 w-full bg-gradient-to-b from-[#1b1b24] to-[#0a0a0f] hover:from-[#2a2a35] hover:to-[#1a1a24] border border-white/10 hover:border-white/20 px-8 py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:-translate-y-1 active:translate-y-1 active:scale-95 text-white uppercase font-bold tracking-widest text-sm tactile-button"
          >
            <ArrowLeft className="h-5 w-5 text-[#c5a059]" />
            Vuelve al Lobby
          </button>
        </div>
      </div>
    )
  }

  const { players, phase, pot, dealerId, countdown } = gameState;

  return (
    <div className="flex flex-col h-screen font-sans relative overflow-hidden bg-[#0d2e1b] bg-[url('https://www.transparenttextures.com/patterns/woven-light.png')] before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] before:from-transparent before:via-[rgba(0,0,0,0.2)] before:to-[rgba(0,0,0,0.85)] before:pointer-events-none">
      {/* HEADER */}
      <GameHeader onMenuClick={() => router.push('/')} />
      
      {/* MAIN GAME AREA */}
      <main className={`flex-1 flex flex-col items-center justify-center relative z-0 p-0 m-0 ${phase === 'LOBBY' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {phase === 'LOBBY' ? (
          <div className="relative text-center w-full min-h-full flex flex-col items-center justify-center px-2 py-4 md:p-8">
            {/* Atmospheric Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay" />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-[#c0a060]/5 rounded-full blur-[150px] pointer-events-none" />
            
            {/* Main Luxury Panel */}
            <div className="relative z-10 w-full max-w-5xl bg-gradient-to-br from-black/70 to-black/90 backdrop-blur-2xl border-2 border-[#c5a059]/30 rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-12 landscape:p-4 landscape:md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col items-center max-h-[92vh] landscape:max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4 md:space-y-10 landscape:space-y-2">
              
              <div className="flex flex-col items-center landscape:flex-row landscape:gap-6 landscape:items-center">
                <Users className="w-8 h-8 md:w-16 md:h-16 text-[#c5a059] drop-shadow-[0_0_15px_rgba(197,160,89,0.5)] mb-2 md:mb-4 landscape:mb-0 landscape:w-8 landscape:h-8" />
                <div className="flex flex-col items-center landscape:items-start">
                  <h2 className="text-3xl md:text-6xl landscape:text-2xl font-display font-black italic text-accent-gold-shimmer leading-none tracking-tight select-none uppercase drop-shadow-premium text-center landscape:text-left">
                    Sala de Espera
                  </h2>
                  <div className="flex items-center gap-3 mt-2 md:mt-6 landscape:mt-1">
                    <div className="hidden sm:block h-0.5 w-8 md:w-12 bg-[#c5a059]/30 rounded-full" />
                    <p className="text-[#f3edd7]/60 text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em]">
                      Jugadores: <span className="text-[#c5a059] text-[11px] md:text-[14px]">{players.length}</span> <span className="opacity-40">/ 7</span>
                    </p>
                    <div className="hidden sm:block h-0.5 w-8 md:w-12 bg-[#c5a059]/30 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Player Plates Grid */}
              {players.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 landscape:grid-cols-4 gap-3 md:gap-6 landscape:gap-2 w-full justify-items-center mt-2 landscape:mt-1">
                  {players.map(p => {
                    const isMe = room?.sessionId === p.id;
                    return (
                      <div 
                        key={p.id} 
                        className={`
                          w-full flex items-center gap-3 md:gap-4 landscape:gap-2 px-4 md:px-6 landscape:px-3 py-3 md:py-4 landscape:py-2 rounded-xl md:rounded-2xl border transition-all
                          ${p.isReady 
                            ? 'bg-gradient-to-br from-[#1b4d3e]/90 to-[#0e2a22] border-[#c5a059]/50 shadow-[0_10px_20px_rgba(0,0,0,0.5)] scale-105 z-10' 
                            : 'bg-black/40 border-white/5 shadow-inner opacity-60'}
                        `}
                      >
                        {/* LED Gem */}
                        <div className={`
                          w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0 border border-black/50
                          ${p.isReady 
                            ? 'bg-gradient-to-br from-[#2ecc71] to-[#27ae60] shadow-[0_0_12px_rgba(46,204,113,0.8)]' 
                            : 'bg-gradient-to-br from-[#e74c3c] to-[#c0392b] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]'} 
                          ${isMe ? 'animate-pulse' : ''}
                        `} />
                        
                        <div className="flex flex-col items-start overflow-hidden flex-1">
                          <span className={`${p.isReady ? 'text-[#f3edd7]' : 'text-slate-400'} font-bold truncate w-full text-left text-xs md:text-base landscape:text-sm`}>
                            {p.nickname} {isMe ? <span className="text-[#c5a059] font-normal text-[10px] md:text-xs ml-1 tracking-widest uppercase">(Tú)</span> : ''}
                          </span>
                          <span className="text-[#c5a059] font-black font-display tracking-tight text-xs md:text-sm landscape:text-xs mt-0.5">
                            ${p.chips >= 1000 ? (p.chips/1000).toFixed(1) + 'k' : p.chips}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {room && (
                <div className="flex flex-col items-center w-full">
                  {players.find(p => p.id === room?.sessionId)?.isReady ? (
                    <button 
                      onClick={() => room.send('toggleReady', { isReady: false })}
                      className="w-full max-w-sm h-16 md:h-20 bg-gradient-to-b from-[#e74c3c] via-[#c0392b] to-[#922b21] hover:from-[#f1948a] hover:via-[#e74c3c] hover:to-[#c0392b] text-[#f3edd7] rounded-2xl font-black text-sm md:text-xl landscape:h-12 landscape:text-xs shadow-[0_15px_30px_rgba(0,0,0,0.8)] hover:-translate-y-1 active:translate-y-1 transition-all uppercase tracking-widest border border-white/20 border-b-[4px] md:border-b-[6px] border-b-[#7b241c] tactile-button"
                    >
                      Anular Listo
                    </button>
                  ) : (
                    <button 
                      onClick={() => room.send('toggleReady', { isReady: true })}
                      className="w-full max-w-sm min-h-[64px] h-16 md:h-20 bg-gradient-to-b from-[#2ecc71] via-[#27ae60] to-[#1e8449] hover:from-[#82e0aa] hover:via-[#2ecc71] hover:to-[#27ae60] text-[#f3edd7] rounded-2xl font-black text-sm md:text-xl landscape:h-14 landscape:min-h-[50px] landscape:text-sm shadow-[0_15px_30px_rgba(0,0,0,0.8)] hover:-translate-y-1 active:translate-y-1 transition-all uppercase tracking-widest border border-white/20 border-b-[4px] md:border-b-[6px] border-b-[#186a3b] tactile-button"
                    >
                      ¡Estoy Listo!
                    </button>
                  )}
                           {/* Status Messages Below Button */}
                  <div className="h-12 md:h-16 mt-2 md:mt-6 flex flex-col justify-center items-center landscape:mt-2">
                    {players.length < (room?.state.minPlayers || 3) ? (
                      <p className="text-[#a0a0b0] uppercase tracking-widest text-[10px] md:text-base font-bold text-center">
                        Esperando al menos <span className="text-[#f3edd7]">{room?.state.minPlayers || 3} jugadores</span>...
                      </p>
                    ) : (
                      <>
                        {players.filter((p: any) => p.isReady).length < (room?.state.minPlayers || 3) && (
                          <p className="text-[#d4af37]/80 uppercase tracking-widest text-sm md:text-base font-bold flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Esperando listos ({players.filter((p: any) => p.isReady).length}/{room?.state.minPlayers || 3})
                          </p>
                        )}
                        
                        {countdown > 0 && countdown <= 60 && (
                          <div className="flex flex-col items-center gap-3 w-full max-w-xs animate-in fade-in zoom-in duration-300">
                             <p className="text-[#fdf0a6] font-black tracking-widest uppercase text-xl">
                                Iniciando: <span className="text-white text-3xl ml-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{countdown}</span>
                             </p>
                             <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#d4af37] to-[#fdf0a6] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(212,175,55,0.8)]"
                                  style={{ width: `${(countdown / 60) * 100}%` }}
                                />
                             </div>
                          </div>
                        )}

                        {players.filter((p: any) => p.isReady).length >= (room?.state.minPlayers || 3) && countdown < 0 && (
                          dealerId === room.sessionId ? (
                            <button 
                              onClick={() => room.send('startGame')}
                              className="bg-transparent text-[#d4af37] border border-[#d4af37]/50 hover:bg-[#d4af37]/10 font-bold px-8 py-3 rounded-full uppercase tracking-widest transition-colors mt-2"
                            >
                              Forzar Inicio
                            </button>
                          ) : (
                            <p className="text-[#d4af37]/70 animate-pulse uppercase tracking-widest text-sm md:text-base font-bold text-center">
                              Esperando al anfitrión...
                            </p>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Board room={room} phase={phase} players={players} pot={pot} />
        )}
        
        {/* Voice Chat Component */}
        {room && (
          <div className="fixed bottom-6 right-6 landscape:bottom-2 landscape:right-2 z-50 landscape:scale-75 origin-bottom-right">
             <VoiceChat 
                roomName={roomId} 
                username={players.find(p => p.id === room?.sessionId)?.nickname || 'Jugador'} 
             />
          </div>
        )}
      </main>

      {/* FOOTER - Solo visible en LOBBY para maximizar espacio de mesa en móviles */}


      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ReconnectOverlay isVisible={isReconnecting} />
      <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />
    </div>
  )
}
