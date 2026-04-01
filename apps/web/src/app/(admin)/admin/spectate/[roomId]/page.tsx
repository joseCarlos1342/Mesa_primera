'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { client } from '@/lib/colyseus';
import { Room } from '@colyseus/sdk';
import { ArrowLeft, Eye, UserX, VolumeX, Ban, Loader2, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const VoiceChat = dynamic(
  () => import('@/components/VoiceChat').then(mod => mod.VoiceChat),
  { ssr: false }
);

export default function SpectatePage() {
  const params = useParams();
  const _router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState({
    players: [] as any[],
    phase: 'LOBBY',
    pot: 0,
    piquePot: 0,
    dealerId: '',
    lastAction: '',
    countdown: -1,
  });

  const hasJoined = useRef(false);

  useEffect(() => {
    if (!roomId || hasJoined.current) return;
    hasJoined.current = true;

    let activeRoom: Room | undefined;

    async function joinAsSpectator() {
      try {
        const joinedRoom = await client.joinById(roomId, { spectator: true });
        activeRoom = joinedRoom;
        setRoom(joinedRoom);

        joinedRoom.onStateChange((state: any) => {
          const playersArray: any[] = [];
          state.players.forEach((player: any) => {
            playersArray.push(player);
          });

          setGameState({
            phase: state.phase,
            pot: state.pot,
            piquePot: state.piquePot || 0,
            dealerId: state.dealerId,
            lastAction: state.lastAction || '',
            countdown: state.countdown,
            players: playersArray,
          });
        });

        joinedRoom.onError((code, message) => {
          setError(message || 'Error de conexión');
        });

        joinedRoom.onLeave(() => {
          setError('Desconectado de la sala');
        });
      } catch (err: any) {
        setError(err.message || 'No se pudo conectar a la sala');
      } finally {
        setLoading(false);
      }
    }

    joinAsSpectator();

    return () => {
      if (activeRoom) activeRoom.leave(true);
    };
  }, [roomId]);

  function handleKick(playerId: string) {
    if (!room) return;
    if (confirm('¿Retirar a este jugador de la mesa?')) {
      room.send('admin:kick', { playerId });
    }
  }

  function handleMute(playerId: string) {
    if (!room) return;
    room.send('admin:mute', { playerId, reason: 'Silenciado por moderador' });
  }

  function handleBan(playerId: string) {
    if (!room) return;
    if (confirm('¿Banear a este jugador? Será retirado de la mesa.')) {
      room.send('admin:ban', { playerId });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 font-bold">{error}</p>
        <Link href="/admin/alerts" className="text-indigo-400 hover:underline text-sm">
          Volver a Alertas
        </Link>
      </div>
    );
  }

  const { players, phase, pot, piquePot, dealerId, lastAction } = gameState;

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <Link href="/admin/alerts" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-widest mb-3 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Alertas de Mesa
          </Link>
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-indigo-400" />
            <h1 className="text-3xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
              MODO ESPECTADOR
            </h1>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            Mesa: <span className="text-slate-300 font-mono text-xs break-all">{roomId}</span>
          </p>
        </div>

        {/* Game Status */}
        <div className="flex gap-3">
          <div className="px-5 py-3 rounded-2xl bg-slate-900/50 border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fase</p>
            <p className="text-lg font-black text-white">{phase}</p>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-slate-900/50 border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pozo</p>
            <p className="text-lg font-black text-emerald-400">${pot + piquePot}</p>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-slate-900/50 border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jugadores</p>
            <p className="text-lg font-black text-white">{players.filter(p => p.connected).length}</p>
          </div>
        </div>
      </div>

      {/* Admin Blindness Notice */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <p className="text-amber-200/70 text-sm">
          <strong className="text-amber-400">Admin Blindness activo:</strong> No puedes ver las cartas de ningún jugador durante la partida activa.
        </p>
      </div>

      {/* Last Action */}
      {lastAction && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest mb-1">Última Acción</p>
          <p className="text-white font-bold">{lastAction}</p>
        </div>
      )}

      {/* Players Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Jugadores en Mesa</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => {
            const isDealer = p.id === dealerId;
            return (
              <div
                key={p.id}
                className={`backdrop-blur-lg border rounded-2xl p-5 transition-all ${
                  p.connected
                    ? p.isFolded
                      ? 'bg-slate-900/30 border-white/5 opacity-50'
                      : 'bg-slate-900/50 border-white/10'
                    : 'bg-red-900/10 border-red-500/10 opacity-40'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-white font-bold">{p.nickname}</span>
                      {isDealer && (
                        <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 uppercase tracking-widest">
                          Mano
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>Fichas: <span className="text-emerald-400 font-bold">${p.chips}</span></span>
                      <span>Cartas: <span className="text-slate-300 font-bold">{p.cardCount}</span></span>
                      {p.isFolded && <span className="text-red-400 font-bold">BOTADO</span>}
                    </div>
                  </div>
                </div>

                {/* Moderation Buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleMute(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/15 text-amber-400 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    title="Silenciar voz"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    Mute
                  </button>
                  <button
                    onClick={() => handleKick(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/15 text-red-400 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    title="Retirar de la mesa"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Kick
                  </button>
                  <button
                    onClick={() => handleBan(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-700/20 text-red-300 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    title="Banear de la mesa"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Ban
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Voice Chat - 2-way audio with the table */}
      <div className="fixed bottom-6 right-6 z-50">
        <VoiceChat
          roomName={roomId}
          username="Soporte"
          showSpeakers={true}
        />
      </div>
    </div>
  );
}
