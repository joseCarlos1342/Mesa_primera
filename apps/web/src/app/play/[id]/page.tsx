'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { Room } from '@colyseus/sdk'
import { Loader2, ArrowLeft, Users, Gamepad2, BookOpen, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useWakeLock } from '../../../../hooks/useWakeLock'
import { RulesModal } from '@/components/game/RulesModal'
import { ReconnectOverlay } from '@/components/game/ReconnectOverlay'
import { GameHeader } from '@/components/game/game-header'
import dynamic from 'next/dynamic'
import { formatCurrency } from '@/utils/format'

const Board = dynamic(
  () => import('../../../components/game/Board').then(mod => mod.Board),
  { ssr: false }
)

const VoiceChat = dynamic(
  () => import('@/components/VoiceChat').then(mod => mod.VoiceChat),
  { ssr: false }
)
import { DepositModal } from '@/components/game/DepositModal'
import { TableHelpModal } from '@/components/game/TableHelpModal'

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showTableHelp, setShowTableHelp] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  // Game State
  const [gameState, setGameState] = useState({
    players: [] as any[],
    phase: 'LOBBY',
    pot: 0,
    piquePot: 0,
    dealerId: '',
    countdown: -1
  })

  /** Cartas privadas del jugador local. Solo llegan vía mensaje privado del servidor. */
  const [myCards, setMyCards] = useState<string>("")
  const [supabaseUserId, setSupabaseUserId] = useState<string>("")
  
  const hasAttemptedJoin = useRef(false)
  /** Marca si el jugador abandonó intencionalmente (evita auto-reconexión) */
  const abandonedRef = useRef(false)
  
  // Mantiene la pantalla encendida en móviles
  useWakeLock()

  // Listen to open-recharge-modal and open-rules-modal events
  useEffect(() => {
    const handleOpenDeposit = () => setShowDeposit(true)
    const handleOpenRules = () => setShowRules(true)
    const handleOpenTableHelp = () => setShowTableHelp(true)
    
    window.addEventListener('open-recharge-modal', handleOpenDeposit)
    window.addEventListener('open-rules-modal', handleOpenRules)
    window.addEventListener('open-table-help', handleOpenTableHelp)
    
    return () => {
      window.removeEventListener('open-recharge-modal', handleOpenDeposit)
      window.removeEventListener('open-rules-modal', handleOpenRules)
      window.removeEventListener('open-table-help', handleOpenTableHelp)
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
        
        // Pequeño delay para permitir que el cliente se estabilice tras un reload rápido
        await new Promise(resolve => setTimeout(resolve, 300));

        // Always fetch Supabase user for features that need it (e.g. table help requests)
        const supabase = createClient()
        const { data: { user: sbUser } } = await supabase.auth.getUser()
        if (sbUser) setSupabaseUserId(sbUser.id);

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
          } catch (e: any) {
            // No mostrar como error crítico si es solo que el token expiró (común tras reinicio de server o mucho tiempo offline)
            if (e.message?.includes("expired") || e.message?.includes("invalid")) {
              console.log("El token de reconexión expiró o es inválido. Entrando como nuevo jugador...");
            } else {
              console.warn("Fallo al reconectar:", e.message || e);
            }
            sessionStorage.removeItem(tokenKey);
          }
        }
        
        if (!joinedRoom) {
          // Sync with Supabase session first
          let avatarUrl = sessionStorage.getItem(`avatarUrl_${roomId}`);
          if (!avatarUrl) {
            avatarUrl = localStorage.getItem('avatarUrl') || 'as-oros';
          }
          
          if (sbUser) {
            // Fetch real balance from wallets table
            const { data: wallet } = await supabase
              .from('wallets')
              .select('balance_cents')
              .eq('user_id', sbUser.id)
              .single()
            
            if (wallet) {
              sessionStorage.setItem(`chips_${roomId}`, wallet.balance_cents.toString())
            }

            if (!nick && sbUser.user_metadata?.username) {
              nick = sbUser.user_metadata.username
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

          const chips = parseInt(sessionStorage.getItem(`chips_${roomId}`) || "1000");

          console.log(`Joining room ${roomId} as new player: ${nick} with ${chips} chips...`);
          joinedRoom = await client.joinById(roomId, {
            nickname: nick,
            deviceId: deviceId,
            avatarUrl: avatarUrl,
            chips: chips,
            userId: sbUser?.id || null
          })
          
          // Guardar el token para permitir reconexiones si se recarga la página (F5)
          sessionStorage.setItem(tokenKey, joinedRoom.reconnectionToken);
        }
        
        activeRoom = joinedRoom;
        console.log('Joined room:', joinedRoom.roomId, 'Session ID:', joinedRoom.sessionId);
        setRoom(joinedRoom)

        joinedRoom.onLeave((code) => {
          console.warn('Left room with code', code)
          // No intentar reconectar si el jugador abandonó intencionalmente
          if (code !== 1000 && !abandonedRef.current) {
            setIsReconnecting(true);
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
        })

        joinedRoom.onError((code, message) => {
          console.error('Colyseus Error [%s]: %s', code, message)
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
            piquePot: state.piquePot || 0,
            dealerId: state.dealerId,
            countdown: state.countdown,
            players: playersArray
          })
        })

        // Cartas privadas: solo el dueño recibe sus cartas reales
        joinedRoom.onMessage("private-cards", (cards: string[]) => {
          setMyCards(cards.join(','));
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
      // Si el jugador ya abandonó explícitamente, no hacer nada (ya se limpió)
      if (abandonedRef.current) return;
      // Desmontaje no intencional (navegación, refresh): NO borrar el token
      // para permitir auto-reconexión desde el lobby.
      // Dejar que el WebSocket se cierre naturalmente (code != 1000)
      // para que el servidor otorgue período de gracia.
      if (activeRoom) {
        activeRoom.leave(false);
      }
    }
  }, [roomId]) // solo lo ejecutamos una vez, por eso hasAttemptedJoin

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#073926] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 mix-blend-multiply pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#d4af37]/8 blur-[120px] rounded-full pointer-events-none" />
        <Loader2 className="h-10 w-10 animate-spin text-[#d4af37] mb-4 relative z-10" />
        <h2 className="text-lg font-black tracking-[0.3em] text-[#fdf0a6]/70 uppercase relative z-10">Conectando a la mesa...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#073926] text-[#f3edd7] p-6 text-center relative overflow-hidden">
        {/* Felt texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 mix-blend-multiply pointer-events-none" />
        {/* Subtle warm glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#d4af37]/8 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 bg-[#0a180e]/90 backdrop-blur-2xl border border-[#d4af37]/30 p-10 rounded-3xl max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.6),_0_0_40px_rgba(212,175,55,0.05)] flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-[#0a180e] border-2 border-[#d4af37]/40 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
             <AlertCircle className="w-7 h-7 text-[#d4af37]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black font-display text-[#fdf0a6] uppercase tracking-[0.2em] mb-3">Error de Conexión</h2>
          <div className="h-px w-24 bg-[#d4af37]/30 mb-4" />
          <p className="text-[#8faa96] mb-8 text-sm md:text-base leading-relaxed">{error}</p>
          <button 
            onClick={() => {
              sessionStorage.removeItem(`reconnectionToken_${roomId}`);
              router.push('/');
            }}
            className="inline-flex items-center justify-center gap-3 w-full bg-gradient-to-b from-[#0f2e1a] to-[#071a0e] hover:from-[#143d23] hover:to-[#0c2414] border border-[#d4af37]/20 hover:border-[#d4af37]/40 px-8 py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:translate-y-1 active:scale-95 text-[#fdf0a6] uppercase font-bold tracking-widest text-sm"
          >
            <ArrowLeft className="h-5 w-5 text-[#d4af37]" />
            Vuelve al Lobby
          </button>
        </div>
      </div>
    )
  }

  const { players, phase, pot, dealerId, countdown } = gameState;

  return (
    <div className="flex flex-col h-screen font-sans relative overflow-hidden bg-[#073926] before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] before:from-transparent before:via-[rgba(0,0,0,0.1)] before:to-[rgba(0,0,0,0.5)] before:pointer-events-none">
      {/* HEADER */}
      <GameHeader onMenuClick={() => {
        // Abandonar partida: limpiar ANTES de navegar para evitar race condition
        abandonedRef.current = true;
        sessionStorage.removeItem(`reconnectionToken_${roomId}`);
        sessionStorage.removeItem(`nickname_${roomId}`);
        sessionStorage.removeItem(`avatarUrl_${roomId}`);
        sessionStorage.removeItem(`chips_${roomId}`);
        if (room) {
          room.send('abandon');
          room.leave(true);
        }
        router.push('/');
      }} />
      
      {/* MAIN GAME AREA */}
      <main className={`flex-1 flex flex-col items-center justify-center relative z-0 p-0 m-0 ${phase === 'LOBBY' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}>
        {phase === 'LOBBY' ? (
          <div className="relative text-center w-full min-h-full flex flex-col items-center justify-center px-2 py-4 md:p-8">
            {/* Atmospheric Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-20 pointer-events-none mix-blend-multiply" />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-[#d4af37]/5 rounded-full blur-[150px] pointer-events-none" />
            
            {/* Main Panel */}
            <div className="relative z-10 w-full max-w-5xl bg-[#0a180e]/90 backdrop-blur-2xl border border-[#d4af37]/25 rounded-3xl md:rounded-[3rem] p-4 md:p-14 landscape:p-4 shadow-[0_40px_100px_rgba(0,0,0,0.6),_0_0_60px_rgba(212,175,55,0.04)] flex flex-col items-center max-h-[92vh] landscape:max-h-[85vh] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6 md:space-y-12">
              
              <div className="flex flex-col items-center gap-3 md:gap-6">
                {/* Row 1: Icon + Title */}
                <div className="flex flex-row items-center gap-3 md:gap-5">
                  <Users className="w-8 h-8 md:w-16 landscape:w-8 text-[#c5a059] drop-shadow-[0_0_15px_rgba(197,160,89,0.5)] flex-shrink-0" />
                  <h2 className="text-3xl md:text-6xl landscape:text-3xl font-display font-black italic text-accent-gold-shimmer leading-none tracking-tight select-none uppercase drop-shadow-premium">
                    Sala de Espera
                  </h2>
                </div>

                {/* Row 2: Players Status (Centered below) */}
                <div className="flex items-center gap-3">
                  <div className="h-0.5 w-6 md:w-12 bg-[#c5a059]/30 rounded-full" />
                  <p className="text-[#f3edd7]/60 text-[10px] md:text-[14px] font-black uppercase tracking-[0.4em] whitespace-nowrap">
                    Jugadores: <span className="text-[#c5a059] text-[11px] md:text-[16px]">{players.length}</span> <span className="opacity-40">/ 7</span>
                  </p>
                  <div className="h-0.5 w-6 md:w-12 bg-[#c5a059]/30 rounded-full" />
                </div>
              </div>

              {/* Player Plates Grid - More Spacious */}
              {players.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-14 w-full px-4 md:px-10 justify-items-center mt-4">
                  {players.map(p => {
                    const isMe = room?.sessionId === p.id;
                    return (
                      <div 
                        key={p.id} 
                        className={`
                          w-full flex items-center gap-4 md:gap-6 px-5 md:px-8 py-4 md:py-6 rounded-2xl md:rounded-3xl border transition-all duration-300
                          ${p.isReady 
                            ? 'bg-[#0f2e1a]/90 border-[#d4af37]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)]' 
                            : 'bg-[#071a0e]/60 border-white/5 shadow-inner opacity-50'}
                        `}
                      >
                        {/* LED Gem */}
                        <div className={`
                          w-3 h-3 md:w-5 md:h-5 rounded-full flex-shrink-0 border border-black/50
                          ${p.isReady 
                            ? 'bg-gradient-to-br from-[#2ecc71] to-[#27ae60] shadow-[0_0_15px_rgba(46,204,113,0.8)]' 
                            : 'bg-gradient-to-br from-[#e74c3c] to-[#c0392b] shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)]'} 
                          ${isMe ? 'animate-pulse' : ''}
                        `} />
                        
                        <div className="flex flex-col items-start overflow-hidden flex-1">
                          <span className={`text-[#f3edd7] font-black tracking-tight truncate w-full text-left text-sm md:text-2xl`}>
                            {p.nickname} {isMe ? <span className="text-[#c5a059] font-normal text-[10px] md:text-sm ml-2 tracking-[0.2em] uppercase opacity-70">(Tú)</span> : ''}
                          </span>
                          <span className="text-[#c5a059] font-mono font-bold tracking-widest text-[10px] md:text-lg mt-1 opacity-90">
                            {formatCurrency(p.chips)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              
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
                        
                        {countdown > 0 && countdown <= 60 ? (
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
                        ) : null}

                        {players.filter((p: any) => p.isReady).length >= (room?.state.minPlayers || 3) && countdown < 0 ? (
                          dealerId === room.sessionId ? (
                            <button 
                              onClick={() => room.send('startGame')}
                              className="bg-transparent text-[#d4af37] border border-[#d4af37]/50 hover:bg-[#d4af37]/10 font-bold px-8 py-3 rounded-full uppercase tracking-widest transition-colors mt-2"
                            >
                              Iniciar Juego
                            </button>
                          ) : (
                            <p className="text-[#d4af37]/70 animate-pulse uppercase tracking-widest text-sm md:text-base font-bold text-center">
                              Esperando al anfitrión...
                            </p>
                          )
                        ) : null}
                      </>
                   )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Board 
            room={room} 
            phase={phase} 
            players={players} 
            pot={pot} 
            piquePot={gameState.piquePot || 0}
            myCards={myCards}
          />
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
      {room && supabaseUserId && (
        <TableHelpModal
          isOpen={showTableHelp}
          onClose={() => setShowTableHelp(false)}
          roomId={roomId}
          userId={supabaseUserId}
        />
      )}
    </div>
  )
}
