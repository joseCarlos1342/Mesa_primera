'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { Room } from '@colyseus/sdk'
import { Loader2, ArrowLeft, Users, AlertCircle, RotateCcw } from 'lucide-react'
import { useWakeLock } from '@/hooks/useWakeLock'
import { RulesModal } from '@/components/game/RulesModal'
import { ReconnectOverlay } from '@/components/game/ReconnectOverlay'
import { GameHeader } from '@/components/game/game-header'
import dynamic from 'next/dynamic'
import { formatCurrency, formatAmount } from '@/utils/format'

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
import { GameTransferModal } from '@/components/game/TransferModal'
import { PermissionsGate } from '@/components/game/PermissionsGate'
import { getPlayRoomShellClassName } from './play-room-shell'

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
  const [showTransfer, setShowTransfer] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Game State
  const [gameState, setGameState] = useState({
    players: [] as any[],
    phase: 'LOBBY',
    pot: 0,
    piquePot: 0,
    dealerId: '',
    countdown: -1,
    minPique: 500_000,
    proposedPique: 0,
    proposedPiqueBy: '',
    piqueVotesFor: 0,
    piqueVotesAgainst: 0,
    piqueVotersTotal: 0,
    currentMaxBet: 0
  })

  // Destructure early to avoid ReferenceError in hooks
  const { 
    players, phase, pot, dealerId: _dealerId, countdown, minPique, 
    proposedPique, proposedPiqueBy, piqueVotesFor, piqueVotesAgainst, piqueVotersTotal 
  } = gameState;

  /** Cartas privadas del jugador local. Solo llegan vía mensaje privado del servidor. */
  const [myCards, setMyCards] = useState<string>("")
  const [supabaseUserId, setSupabaseUserId] = useState<string>("")
  const [showPiqueOptions, setShowPiqueOptions] = useState(false)
  const [hasVotedPique, setHasVotedPique] = useState(false)
  const [bandaEvent, setBandaEvent] = useState<any>(null)
  const [disabledChips, setDisabledChips] = useState<number[]>([])
  /** Mensaje de saldo insuficiente recibido del servidor al volver al LOBBY */
  const [insufficientBalance, setInsufficientBalance] = useState<{ required: number; current: number; message: string } | null>(null)
  /** Opción válida de juego derivada por el servidor para DECLARAR_JUEGO */
  const [validJuegoOption, setValidJuegoOption] = useState<{ hasJuego: boolean; handType: string } | null>(null)
  /** Si el servidor reabrió el Pique para que los que pasaron puedan igualar */
  const [piqueReopenActive, setPiqueReopenActive] = useState(false)
  /** Prompt de resolución inmediata: Llevo Juego / No Llevo (paso definitivo con juego en APUESTA_4_CARTAS) */
  const [pasoJuegoChoice, setPasoJuegoChoice] = useState<{ handType: string } | null>(null)
  const hasAttemptedJoin = useRef(false)
  /** Marca si el jugador abandonó intencionalmente (evita auto-reconexión) */
  const abandonedRef = useRef(false)

  // Mantiene la pantalla encendida en móviles
  useWakeLock()

  // ── Igualar fondo de html/body al verde del juego para evitar bordes y flashes ──
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlBg = html.style.backgroundColor
    const prevBodyBg = body.style.backgroundColor
    const prevOverscroll = body.style.overscrollBehavior

    html.style.backgroundColor = '#073926'
    body.style.backgroundColor = '#073926'
    body.style.overscrollBehavior = 'none'

    return () => {
      html.style.backgroundColor = prevHtmlBg
      body.style.backgroundColor = prevBodyBg
      body.style.overscrollBehavior = prevOverscroll
    }
  }, [])

  // ── Detección de orientación: bloquear en portrait y auto-cancelar "Listo" ──
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(orientation: portrait)')
    setIsPortrait(mql.matches)

    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mql.addEventListener('change', handler)
    return () => {
      mql.removeEventListener('change', handler)
      // Al desmontar la página de juego, desbloquear orientación landscape
      const so = window.screen.orientation as ScreenOrientation & { unlock?: () => void }
      try { so?.unlock?.() } catch {}
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  // Si el jugador rota a portrait estando "Listo" en LOBBY, auto-cancelar su ready
  useEffect(() => {
    if (!isPortrait || !room || phase !== 'LOBBY') return
    const me = players.find(p => p.id === room.sessionId)
    if (me?.isReady) {
      room.send('toggleReady', { isReady: false })
    }
  }, [isPortrait, room, phase, players])

  // Reset voto local si la propuesta cambia (nueva propuesta o se resolvió)
  useEffect(() => {
    if (proposedPique === 0) {
      setHasVotedPique(false)
      setShowPiqueOptions(false)
    }
  }, [proposedPique])

  // Listen to open-recharge-modal and open-rules-modal events
  useEffect(() => {
    const handleOpenDeposit = () => setShowDeposit(true)
    const handleOpenRules = () => setShowRules(true)
    const handleOpenTableHelp = () => setShowTableHelp(true)
    const handleOpenTransfer = () => setShowTransfer(true)

    window.addEventListener('open-recharge-modal', handleOpenDeposit)
    window.addEventListener('open-rules-modal', handleOpenRules)
    window.addEventListener('open-table-help', handleOpenTableHelp)
    window.addEventListener('open-transfer-modal', handleOpenTransfer)

    return () => {
      window.removeEventListener('open-recharge-modal', handleOpenDeposit)
      window.removeEventListener('open-rules-modal', handleOpenRules)
      window.removeEventListener('open-table-help', handleOpenTableHelp)
      window.removeEventListener('open-transfer-modal', handleOpenTransfer)
    }
  }, [])

  useEffect(() => {
    if (!roomId) return;
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    let activeRoom: Room | undefined;

    async function joinRoom() {
      try {

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
            joinedRoom = await client.reconnect(savedToken);
            // Save fresh token so subsequent reloads don't use a consumed one
            sessionStorage.setItem(tokenKey, joinedRoom.reconnectionToken);
            // Signal that we're hydrating a reconnect — overlay shows until private-cards arrive
            setIsReconnecting(true);
            // Safety timeout: clear overlay if private-cards never arrives
            setTimeout(() => setIsReconnecting(false), 5000);
          } catch (e: any) {
            // No mostrar como error crítico si es solo que el token expiró (común tras reinicio de server o mucho tiempo offline)
            if (e.message?.includes("expired") || e.message?.includes("invalid")) {
              // Token expiró — normal tras reinicio de server
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
              const balance = wallet.balance_cents;
              // VALIDACIÓN DE SALDO MÍNIMO ($50,000)
              if (balance < 5000000) {
                setError("Fondos insuficientes. Se requiere un saldo mínimo de $50,000 para entrar a una mesa. Por favor, recargue su cuenta.");
                setLoading(false);
                return;
              }
              sessionStorage.setItem(`chips_${roomId}`, balance.toString())
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

          // Use the server-assigned device ID from the single-session policy
          let deviceId: string | null = null;
          if (sbUser) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('last_device_id')
              .eq('id', sbUser.id)
              .single()
            deviceId = profile?.last_device_id || null;
          }
          if (!deviceId) {
            deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
              deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
              localStorage.setItem('deviceId', deviceId);
            }
          }

          const chips = parseInt(sessionStorage.getItem(`chips_${roomId}`) || "1000");

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
        setRoom(joinedRoom)

        joinedRoom.onLeave((code) => {
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
            players: playersArray,
            minPique: state.minPique ?? 500_000,
            proposedPique: state.proposedPique ?? 0,
            proposedPiqueBy: state.proposedPiqueBy ?? '',
            piqueVotesFor: state.piqueVotesFor ?? 0,
            piqueVotesAgainst: state.piqueVotesAgainst ?? 0,
            piqueVotersTotal: state.piqueVotersTotal ?? 0,
            currentMaxBet: state.currentMaxBet ?? 0
          })

          // Limpiar alerta de saldo insuficiente cuando sale de LOBBY (nueva partida iniciada)
          if (state.phase !== 'LOBBY') {
            setInsufficientBalance(null);
          }
          // If reconnecting into LOBBY/STARTING, no private-cards will arrive — clear overlay
          if (state.phase === 'LOBBY' || state.phase === 'STARTING') {
            setIsReconnecting(false);
          }
          // Limpiar opción de juego cuando sale de DECLARAR_JUEGO
          if (state.phase !== 'DECLARAR_JUEGO') {
            setValidJuegoOption(null);
          }
          // Limpiar prompt de paso-juego cuando sale de APUESTA_4_CARTAS
          if (state.phase !== 'APUESTA_4_CARTAS') {
            setPasoJuegoChoice(null);
          }
          // Limpiar reapertura de pique cuando sale de PIQUE
          if (state.phase !== 'PIQUE') {
            setPiqueReopenActive(false);
          }

          // Resync silencioso: si el servidor dice que tengo cartas pero localmente no las tengo
          const me = playersArray.find((p: any) => p.id === joinedRoom.sessionId);
          if (me && me.cardCount > 0 && state.phase !== 'LOBBY' && state.phase !== 'STARTING') {
            // Use a ref to avoid repeated resyncs
            setMyCards(prev => {
              const localCount = prev ? prev.split(',').filter(Boolean).length : 0;
              if (localCount === 0 || localCount !== me.cardCount) {
                joinedRoom.send('request-resync');
              }
              return prev;
            });
          }
        })

        // Cartas privadas: solo el dueño recibe sus cartas reales
        joinedRoom.onMessage("private-cards", (cards: string[]) => {
          setMyCards(cards.join(','));
          // Reconnect hydration complete — cards have been restored
          setIsReconnecting(false);
        })

        // Opción válida de juego derivada por el servidor
        joinedRoom.onMessage("declarar-juego-option", (data: { hasJuego: boolean; handType: string }) => {
          setValidJuegoOption(data);
        })

        // Prompt de resolución inmediata: Llevo Juego / No Llevo (paso definitivo con juego)
        joinedRoom.onMessage("paso-juego-choice", (data: { handType: string }) => {
          setPasoJuegoChoice(data);
        })

        // Animación: devolver cartas al mazo cuando un jugador no lleva juego
        joinedRoom.onMessage("fold-return-cards", (data: { playerId: string; cardCount: number }) => {
          const fakeCards = Array.from({ length: data.cardCount }, (_, i) => `fold-back-${Date.now()}-${i}`);
          window.dispatchEvent(new CustomEvent('animate-discard', {
            detail: { fromPlayerId: data.playerId, cards: fakeCards, isFaceUp: false }
          }));
        })

        // Configuración de la sala (chips deshabilitados, etc.)
        joinedRoom.onMessage("room-config", (config: { disabledChips?: number[] }) => {
          setDisabledChips(config.disabledChips || []);
        })

        // Reset voto local cuando cambia la propuesta de pique
        joinedRoom.onMessage("pique_approved", () => {
          setHasVotedPique(false);
          setShowPiqueOptions(false);
        })
        joinedRoom.onMessage("pique_rejected", () => {
          setHasVotedPique(false);
          setShowPiqueOptions(false);
        })

        // Evento de banda para animaciones
        joinedRoom.onMessage("banda", (data: any) => {
          setBandaEvent(data);
          setPiqueReopenActive(false);
          setTimeout(() => setBandaEvent(null), 4000);
        })

        // Reapertura de Pique: jugadores que pasaron antes de la apuesta pueden igualar
        joinedRoom.onMessage("pique-reopen", () => {
          setPiqueReopenActive(true);
        })

        // Errores inline del servidor (ej: pique mínimo no alcanzado)
        joinedRoom.onMessage("error", (data: any) => {
          if (data?.message) {
            setBandaEvent({ winnerNickname: '⚠', totalBanda: 0, bandaPerPlayer: 0, details: [], _errorMsg: data.message });
            setTimeout(() => setBandaEvent(null), 3000);
          }
        })

        // Saldo insuficiente al volver al LOBBY — el jugador debe recargar
        joinedRoom.onMessage("insufficient-balance", (data: any) => {
          setInsufficientBalance(data);
        })

        // ── Single-session policy: force logout ──
        joinedRoom.onMessage("ForceLogout", (data: any) => {
          abandonedRef.current = true; // prevent auto-reconnection
          // Clear reconnection token so the kicked session can't re-enter
          sessionStorage.removeItem(`reconnectionToken_${roomId}`);
          alert(data?.message || "Se ha iniciado sesión en otro dispositivo. Tu sesión actual ha expirado.");
          joinedRoom?.leave(true);
          router.push('/login/player?kicked=true');
        })

        // Resincronización explícita tras reconexión:
        // El servidor envía private-cards durante onJoin/allowReconnection,
        // pero el mensaje puede llegar antes de que los listeners estén activos.
        // Este request-resync garantiza la entrega después de registrar todos los handlers.
        joinedRoom.send('request-resync');

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
  }, [roomId, router]) // solo lo ejecutamos una vez, por eso hasAttemptedJoin

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#073926] relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 mix-blend-multiply pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#d4af37]/8 blur-[120px] rounded-full pointer-events-none" />
        <Loader2 className="h-10 w-10 animate-spin text-[#d4af37] mb-4 relative z-10" />
        <h2 className="text-lg font-black tracking-[0.3em] text-[#fdf0a6]/70 uppercase relative z-10 text-center px-6">Conectando a la mesa...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#073926] text-[#f3edd7] p-6 text-center relative">
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


  return (
    <PermissionsGate>
      <div className={getPlayRoomShellClassName(phase)}>

        {/* ── ORIENTATION WARNING (global, cubre LOBBY y GAME) ── */}
      {isPortrait && (
        <div className="fixed inset-0 z-[1000] bg-[#073926] flex flex-col items-center justify-center p-8 text-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 mix-blend-multiply pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#d4af37]/8 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 mb-8 w-24 h-24 flex items-center justify-center bg-[#0a180e]/80 rounded-3xl border border-[#d4af37]/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-[spin_4s_ease-in-out_infinite]">
            <RotateCcw className="w-14 h-14 text-[#d4af37]" />
          </div>
          <h2 className="relative z-10 text-3xl font-black text-[#fdf0a6] mb-3 italic uppercase tracking-wider">Gira tu Dispositivo</h2>
          <div className="relative z-10 h-px w-24 bg-[#d4af37]/30 mb-4" />
          <p className="relative z-10 text-[#8faa96] text-base leading-relaxed max-w-xs">
            Para jugar en <span className="text-[#d4af37] font-bold uppercase tracking-wider">Primera Riverada</span>, necesitas usar tu pantalla en horizontal.
          </p>
        </div>
      )}

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

        {/* ── Banda / Error Notification Overlay ── */}
        {bandaEvent && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-[#0a180e]/95 border border-[#d4af37]/40 rounded-2xl px-6 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.8),_0_0_20px_rgba(212,175,55,0.15)] flex flex-col items-center gap-1 backdrop-blur-xl">
              {bandaEvent._errorMsg ? (
                <>
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-red-400">Error</span>
                  <span className="text-sm md:text-base font-bold text-[#fdf0a6]">{bandaEvent._errorMsg}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-[#d4af37]">Cobro de Banda</span>
                  <span className="text-lg md:text-2xl font-black text-[#fdf0a6]">
                    {bandaEvent.winnerNickname} +${formatAmount(bandaEvent.totalBanda)}
                  </span>
                  <span className="text-[9px] md:text-[11px] text-[#8faa96] font-bold">
                    ${formatAmount(bandaEvent.bandaPerPlayer)} × {bandaEvent.details?.length || 0} jugador(es)
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        {phase === 'LOBBY' ? (
          <div className="relative text-center w-full min-h-full flex flex-col items-center justify-center px-2 pt-14 pb-4 md:p-8 md:pt-20">
            {/* Main Panel */}
            <div className="relative z-10 w-full max-w-5xl bg-[#0a180e]/90 backdrop-blur-2xl border border-[#d4af37]/25 rounded-2xl md:rounded-[3rem] p-3 md:p-14 landscape:p-3 shadow-[0_40px_100px_rgba(0,0,0,0.6),_0_0_60px_rgba(212,175,55,0.04)] flex flex-col items-center max-h-[85vh] landscape:max-h-[80vh] overflow-hidden custom-scrollbar space-y-0">
              <div className="w-full flex flex-col items-center overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 md:space-y-12 py-2 md:py-2 px-1">

                <div className="flex flex-col items-center gap-2 md:gap-6">
                  {/* Row 1: Icon + Title */}
                  <div className="flex flex-row items-center gap-2 md:gap-5">
                    <Users className="w-6 h-6 md:w-16 landscape:w-8 text-[#c5a059] drop-shadow-[0_0_15px_rgba(197,160,89,0.5)] flex-shrink-0" />
                    <h2 className="text-2xl md:text-6xl landscape:text-2xl font-display font-black italic text-accent-gold-shimmer leading-none tracking-tight select-none uppercase drop-shadow-premium">
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

                {/* ── Pique Mínimo Config ── */}
                <div className="w-full px-2 md:px-10">
                  <div className="bg-[#071a0e]/80 border border-[#d4af37]/20 rounded-xl p-3 md:p-5 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a059]/70">Pique Mínimo</span>
                    <span className="text-xl md:text-3xl font-black text-[#fdf0a6] tracking-tight">
                      ${formatAmount(minPique)}
                    </span>
                    <span className="text-[8px] md:text-[10px] text-[#8faa96] font-bold uppercase tracking-wider">
                      Banda: ${minPique >= 1_000_000 ? '5,000' : '2,000'} por jugador
                    </span>

                    {/* Propuesta activa: mostrar votación */}
                    {proposedPique > 0 ? (
                      <div className="bg-[#0f2e1a]/90 border border-[#d4af37]/30 rounded-xl p-3 w-full flex flex-col items-center gap-2 mt-1">
                        <span className="text-[9px] md:text-[11px] text-[#c5a059] uppercase tracking-wider font-bold">
                          {players.find((p: any) => p.id === proposedPiqueBy)?.nickname || 'Jugador'} propone:
                        </span>
                        <span className="text-lg md:text-2xl font-black text-[#fdf0a6]">
                          ${formatAmount(proposedPique)}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] md:text-xs text-[#8faa96] font-bold">
                          <span className="text-emerald-400">✓ {piqueVotesFor}</span>
                          <span className="text-red-400">✗ {piqueVotesAgainst}</span>
                          <span className="opacity-50">/ {piqueVotersTotal}</span>
                        </div>
                        {room && room.sessionId !== proposedPiqueBy && !hasVotedPique && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => { room.send('vote_pique', { approve: true }); setHasVotedPique(true); }}
                              className="px-4 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-black text-[10px] md:text-xs uppercase tracking-wider border border-emerald-500/30 transition-all active:scale-95"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => { room.send('vote_pique', { approve: false }); setHasVotedPique(true); }}
                              className="px-4 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-white font-black text-[10px] md:text-xs uppercase tracking-wider border border-red-500/30 transition-all active:scale-95"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                        {room && room.sessionId === proposedPiqueBy && (
                          <span className="text-[9px] text-[#c5a059]/60 uppercase tracking-wider italic">Tu propuesta</span>
                        )}
                        {hasVotedPique && room?.sessionId !== proposedPiqueBy && (
                          <span className="text-[9px] text-emerald-400/60 uppercase tracking-wider italic">Voto registrado</span>
                        )}
                      </div>
                    ) : (
                      /* Botón para proponer cambio */
                      room && !showPiqueOptions ? (
                        <button
                          onClick={() => setShowPiqueOptions(true)}
                          className="mt-1 px-4 py-1.5 rounded-xl bg-[#0a180e] border border-[#d4af37]/20 text-[#c5a059] font-bold text-[10px] md:text-xs uppercase tracking-wider hover:border-[#d4af37]/50 transition-all active:scale-95"
                        >
                          Cambiar Pique
                        </button>
                      ) : room && showPiqueOptions ? (
                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                          {[500_000, 1_000_000, 2_000_000, 5_000_000].map(amount => (
                            <button
                              key={amount}
                              onClick={() => {
                                room.send('propose_pique', { amount });
                                setShowPiqueOptions(false);
                              }}
                              disabled={amount === minPique}
                              className="px-3 py-1.5 rounded-xl bg-[#0a180e] border border-[#d4af37]/20 text-[#fdf0a6] font-bold text-[10px] md:text-xs hover:border-[#d4af37]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                              ${formatAmount(amount)}
                            </button>
                          ))}
                          <button
                            onClick={() => setShowPiqueOptions(false)}
                            className="px-3 py-1.5 rounded-xl text-[#8faa96] text-[10px] md:text-xs hover:text-white transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>

                {/* Player Plates Grid - More Spacious */}
                {players.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-14 w-full px-2 md:px-10 justify-items-center mt-2">
                    {players.map(p => {
                      const isMe = room?.sessionId === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`
                          w-full flex items-center gap-3 md:gap-6 px-3 md:px-8 py-3 md:py-6 rounded-xl md:rounded-3xl border transition-all duration-300
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
                    {/* ── Alerta de saldo insuficiente ── */}
                    {insufficientBalance && (
                      <div className="w-full max-w-sm mb-4 bg-[#2a1008]/90 border border-[#e74c3c]/40 rounded-2xl px-5 py-4 backdrop-blur-md flex flex-col items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-[#e74c3c] flex-shrink-0" />
                          <span className="text-[#f3edd7] font-bold text-xs md:text-sm text-center leading-snug">
                            {insufficientBalance.message}
                          </span>
                        </div>
                        <button
                          onClick={() => { setShowDeposit(true); }}
                          className="w-full h-12 md:h-14 bg-gradient-to-b from-[#d4af37] via-[#c5a028] to-[#8a6d1c] hover:from-[#fdf0a6] hover:via-[#d4af37] hover:to-[#c5a028] text-[#1a0a00] rounded-xl font-black text-sm md:text-base shadow-[0_10px_20px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all uppercase tracking-widest border border-[#d4af37]/40 border-b-[3px] border-b-[#5c4613]"
                        >
                          Cargar Fichas
                        </button>
                      </div>
                    )}

                    {insufficientBalance ? (
                      /* Botón deshabilitado cuando no tiene saldo */
                      <button
                        disabled
                        className="w-full max-w-sm min-h-[64px] h-16 md:h-20 bg-gradient-to-b from-[#4b5563] to-[#374151] text-[#9ca3af] rounded-2xl font-black text-sm md:text-xl landscape:h-14 landscape:min-h-[50px] landscape:text-sm shadow-inner uppercase tracking-widest border border-white/5 cursor-not-allowed opacity-60"
                      >
                        Saldo Insuficiente
                      </button>
                    ) : players.find(p => p.id === room?.sessionId)?.isReady ? (
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
                    <div className="min-h-12 md:min-h-16 mt-2 md:mt-6 flex flex-col justify-center items-center landscape:mt-2">
                      {(() => {
                        const isFirst = room?.state.isFirstGame ?? true;
                        const requiredMin = isFirst ? (room?.state.minPlayers || 3) : 2;
                        return players.length < requiredMin ? (
                          <p className="text-[#a0a0b0] uppercase tracking-widest text-[10px] md:text-base font-bold text-center">
                            Esperando al menos <span className="text-[#f3edd7]">{requiredMin} jugadores</span>...
                          </p>
                        ) : null;
                      })()}
                      {players.length >= (room?.state.isFirstGame ? (room?.state.minPlayers || 3) : 2) && (
                        <>
                          {countdown > 0 && countdown <= 5 ? (
                            /* ── Countdown de 5 segundos: indicador circular premium ── */
                            <div className="flex flex-col items-center gap-4 w-full max-w-xs animate-in fade-in zoom-in duration-300">
                              {/* Circular countdown */}
                              <div className="relative w-24 h-24 md:w-28 md:h-28">
                                {/* Track */}
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="6" />
                                  <circle
                                    cx="50" cy="50" r="42"
                                    fill="none"
                                    stroke="url(#countdownGradient)"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 42}
                                    strokeDashoffset={2 * Math.PI * 42 * (1 - countdown / 5)}
                                    className="transition-all duration-1000 ease-linear"
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' }}
                                  />
                                  <defs>
                                    <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor="#d4af37" />
                                      <stop offset="100%" stopColor="#fdf0a6" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                {/* Number */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span
                                    key={countdown}
                                    className="text-[#fdf0a6] text-4xl md:text-5xl font-black font-display italic drop-shadow-[0_0_20px_rgba(212,175,55,0.6)] animate-in zoom-in duration-200"
                                  >
                                    {countdown}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[#c5a059] font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">
                                Iniciando partida
                              </p>
                            </div>
                          ) : (
                            /* ── Estado de espera cuando no hay countdown ── */
                            (() => {
                              const readyCount = players.filter((p: any) => p.isReady).length;
                              const totalActive = players.length;
                              if (readyCount < totalActive) {
                                return (
                                  <p className="text-[#d4af37]/80 uppercase tracking-widest text-sm md:text-base font-bold flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Esperando listos ({readyCount}/{totalActive})
                                  </p>
                                );
                              }
                              return null;
                            })()
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
            minPique={minPique}
            currentMaxBet={gameState.currentMaxBet}
            disabledChips={disabledChips}
            validJuegoOption={validJuegoOption}
            piqueReopenActive={piqueReopenActive}
            pasoJuegoChoice={pasoJuegoChoice}
            onPasoJuegoResolved={() => setPasoJuegoChoice(null)}
          />
        )}

        {/* Voice Chat Component */}
        {room && (
          <div className="fixed bottom-24 right-4 landscape:bottom-16 landscape:right-2 z-50 landscape:scale-75 origin-bottom-right">
            <VoiceChat
              roomName={roomId}
              username={players.find(p => p.id === room?.sessionId)?.nickname || 'Jugador'}
            />
          </div>
        )}
      </main>

      {/* FOOTER - Solo visible en LOBBY para maximizar espacio de mesa en móviles */}


      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ReconnectOverlay isVisible={isReconnecting} message="Sincronizando tu mesa..." />
      <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />
      <GameTransferModal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        room={room}
        myChips={players.find(p => p.id === room?.sessionId)?.chips ?? 0}
      />
        {room && supabaseUserId && (
          <TableHelpModal
            isOpen={showTableHelp}
            onClose={() => setShowTableHelp(false)}
            roomId={roomId}
            userId={supabaseUserId}
          />
        )}
      </div>
    </PermissionsGate>
  )
}
