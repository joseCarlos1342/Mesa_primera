'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useIsSpeaking,
  useConnectionState,
  StartAudio,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { Mic, MicOff, VolumeX } from 'lucide-react';
import { PlayerSheet } from '@/components/player/PlayerSheet';
import { useGamePermissions } from '@/hooks/useGamePermissions';

interface VoiceChatProps {
  roomName: string;
  username: string;
  showSpeakers?: boolean;
}

export function VoiceChat({ roomName, username, showSpeakers = false }: VoiceChatProps) {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAdminMuted, setIsAdminMuted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleOpenModal = () => setIsAudioModalOpen(true);
    window.addEventListener('open-player-audio-modal', handleOpenModal);
    return () => window.removeEventListener('open-player-audio-modal', handleOpenModal);
  }, []);

  // Register before requesting the LiveKit token so moderation cannot race
  // with the initial mount or a reconnect.
  useEffect(() => {
    const handleAdminMute = () => setIsAdminMuted(true);
    const handleAdminUnmute = () => setIsAdminMuted(false);
    window.addEventListener('admin-voice-muted', handleAdminMute);
    window.addEventListener('admin-voice-unmuted', handleAdminUnmute);
    return () => {
      window.removeEventListener('admin-voice-muted', handleAdminMute);
      window.removeEventListener('admin-voice-unmuted', handleAdminUnmute);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/livekit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomName }),
        });
        const data = await resp.json();
        
        if (data.token && data.url) {
          setToken(data.token);
          setUrl(data.url);
        }
      } catch (e) {
        console.error('Failed to fetch LiveKit token', e);
      }
    })();
  }, [roomName, username]);

  if (!token || !url) {
    return (
      <>
        <p
          role="status"
          className="rounded-full border border-[#8b6b2e]/70 bg-[#120806]/90 px-3 py-1 text-sm text-[#d9d3bf] shadow-[0_6px_14px_rgba(0,0,0,0.6)]"
        >
          Conectando la voz…
        </p>
        {/* Sin canal de voz el menú igual responde: explica el estado en vez de no hacer nada. */}
        <PlayerSheet
          open={isAudioModalOpen}
          onClose={() => setIsAudioModalOpen(false)}
          title="Audio de jugadores"
          description="La voz de la mesa todavía se está conectando."
          closeLabel="Cerrar audio de jugadores"
        >
          <p className="py-4 text-lg leading-relaxed text-[#d9d3bf]">
            Cuando el canal de voz esté listo podrás silenciar aquí a cualquier jugador, solo para ti. Si no conecta, revisa tu internet y el permiso del micrófono.
          </p>
        </PlayerSheet>
      </>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={url}
      connect={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoCodec: 'vp8',
          red: false,
        }
      }}
      className={`flex items-center gap-2 transition-all duration-500 ${
        showSpeakers 
          ? "p-2 bg-[#0d211a]/90 backdrop-blur-xl border border-[#c0a060]/20 shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_1px_10px_rgba(192,160,96,0.05)] rounded-[2rem]" 
          : "bg-transparent p-0"
      }`}
    >
      {showSpeakers && (
        <div className="flex flex-wrap items-center gap-2 justify-center pl-2 sm:pl-4 pr-2">
           <ActiveSpeakers />
        </div>
      )}

      <RoomAudioRenderer />
      
      {/* Overlay to handle AudioContext if blocked */}
      <StartAudio 
        label="Activar Audio" 
        className="group fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      >
        <div className="mx-4 flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-[#8b6b2e] bg-[#120806] p-6 text-center shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(240,170,105,0.28)]">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full border border-[#8b6b2e] bg-[#0a2c20] text-brand-gold-light">
            <VolumeX className="h-7 w-7" />
          </span>
          <p className="font-display text-[1.5rem] font-bold leading-tight text-text-premium">Activa el sonido de la mesa</p>
          <p className="text-base leading-relaxed text-[#d9d3bf]">El navegador pausó el audio. Toca para escuchar a los jugadores.</p>
          <span className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-gold px-6 text-lg font-bold text-[#0a0a0a] group-hover:bg-brand-gold-light">
            Activar sonido
          </span>
        </div>
      </StartAudio>

       <CustomMicToggle forcedMuted={isAdminMuted} />

      {mounted && <PlayerAudioModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} />}
    </LiveKitRoom>
  );
}

function CustomMicToggle({ forcedMuted }: { forcedMuted: boolean }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const connectionState = useConnectionState();
  const { microphone: micPermission } = useGamePermissions();
  const [isPending, setIsPending] = useState(false);
  const isAdminMuted = forcedMuted;

  const isConnected = connectionState === ConnectionState.Connected;
  const micUnavailable = micPermission === 'unavailable' || micPermission === 'denied';

  useEffect(() => {
    if (forcedMuted) void localParticipant?.setMicrophoneEnabled(false);
  }, [forcedMuted, localParticipant]);

  const [micNotice, setMicNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!micNotice) return;
    const t = setTimeout(() => setMicNotice(null), 6000);
    return () => clearTimeout(t);
  }, [micNotice]);

  const toggleMic = async () => {
    if (!localParticipant || isPending || !isConnected || isAdminMuted) return;

    if (micUnavailable) {
      setMicNotice(
        micPermission === 'denied'
          ? 'Denegaste el permiso del micrófono. Actívalo en los ajustes del navegador.'
          : 'El navegador bloqueó el micrófono porque la conexión no es segura (HTTPS).'
      );
      return;
    }

    setIsPending(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e: any) {
      console.error('Failed to toggle mic', e);
      setMicNotice('No se pudo activar el micrófono. Revisa los permisos o el dispositivo.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {micNotice && (
        <p role="alert" className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-[#e74c3c]/70 bg-[#2a0f0c] px-3 py-2 text-base leading-snug text-[#f6d5d0] shadow-[0_12px_28px_-10px_rgba(0,0,0,0.9)]">
          {micNotice}
        </p>
      )}

      <button 
        onClick={toggleMic}
        disabled={isPending || !isConnected || micUnavailable || isAdminMuted}
        className={`group relative flex items-center justify-center w-10 h-10 md:w-14 md:h-14 landscape:w-9 landscape:h-9 md:landscape:w-14 md:landscape:h-14 rounded-full transition-all hover:-translate-y-0.5 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)]
          ${isMicrophoneEnabled 
            ? 'bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#14532d] hover:from-[#86efac] hover:via-[#22c55e] border border-[#86efac]/50 border-b-[4px] border-b-[#064e3b] text-white' 
            : 'bg-gradient-to-b from-[#f87171] via-[#dc2626] to-[#991b1b] hover:from-[#fca5a5] hover:via-[#ef4444] border border-[#fca5a5]/50 border-b-[4px] border-b-[#7f1d1d] text-white'
          }`}
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        title={isAdminMuted ? 'Micrófono silenciado por administración' : 'Activar o desactivar micrófono'}
      >
        {/* OFF STATE */}
        {!isMicrophoneEnabled && (
          <MicOff className="w-4 h-4 md:w-6 md:h-6 drop-shadow-md" />
        )}

        {/* ON STATE */}
        {isMicrophoneEnabled && (
          <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping bg-emerald-300 opacity-60"></div>
              <Mic className="w-4 h-4 md:w-6 md:h-6 relative z-10 drop-shadow-md text-[#fdf0a6]" />
          </div>
        )}
      </button>
    </div>
  );
}

function ActiveSpeakers() {
  const participants = useParticipants();
  
  // Exclude local participant or show all depending on the need.
  // Here we show all participants so users can see if their own mic is picking up.
  return (
    <>
      {participants.map((p) => (
        <SpeakerIndicator key={p.identity} participant={p} />
      ))}
    </>
  );
}

function SpeakerIndicator({ participant }: { participant: any }) {
  const isSpeaking = useIsSpeaking(participant);

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-inner border 
      ${isSpeaking 
        ? 'bg-gradient-to-br from-[#1b4d3e] to-[#0d211a] border-[#4ade80]/40 text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]' 
        : 'bg-[#1b4d3e]/30 border-[#c0a060]/10 text-[#f3edd7]/40 opacity-70'
      }`}
    >
      {/* Gem Indicator */}
      <span className={`w-3 h-3 rounded-full border border-black/50 transition-colors min-w-3
        ${isSpeaking 
          ? 'bg-gradient-to-br from-[#4ade80] to-[#16a34a] shadow-[0_0_15px_rgba(74,222,128,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)] animate-pulse' 
          : 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]'
        }`} 
      />
      {participant.name !== 'Jugador' && (
        <span className="tracking-wide">{participant.name || participant.identity}</span>
      )}
    </div>
  );
}

// ==========================================
// MUTE / VOLUME MODAL FOR OTHER PLAYERS
// ==========================================

export function PlayerAudioModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Filter out the local user so we don't try to "mute" ourselves in the playback
  const remoteParticipants = participants.filter(p => p.identity !== localParticipant?.identity);

  return (
    <PlayerSheet
      open={isOpen}
      onClose={onClose}
      title="Audio de jugadores"
      description="Silencia a quien quieras solo para ti. Los demás no lo notan."
      closeLabel="Cerrar audio de jugadores"
    >
      {remoteParticipants.length === 0 ? (
        <p className="py-8 text-center text-lg text-[#bdb7a6]">No hay otros jugadores con voz en la mesa.</p>
      ) : (
        <ul className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
          {remoteParticipants.map(p => (
            <PlayerAudioRow key={p.identity} participant={p} />
          ))}
        </ul>
      )}
    </PlayerSheet>
  );
}

function PlayerAudioRow({ participant }: { participant: any }) {
  // Volume state strictly for local UI feedback
  const [isMuted, setIsMuted] = useState(false);
  const isSpeaking = useIsSpeaking(participant);
  
  // Gets the audio track publication for this remote participant
  const audioTrack = participant.getTrackPublication(Track.Source.Microphone);

  const toggleMute = () => {
    if (!audioTrack?.track) return;
    const newMuted = !isMuted;
    const htmlAudioElements = audioTrack.track.attachedElements as HTMLMediaElement[];
    if (htmlAudioElements.length === 0) {
      // Track exists but not yet attached — set volume via track enabled state
      audioTrack.track.enabled = !newMuted;
    } else {
      htmlAudioElements.forEach(el => {
        el.muted = newMuted;
      });
    }
    setIsMuted(newMuted);
  };

  const hasTrack = !!audioTrack?.track;

  const name = participant.name !== 'Jugador' ? participant.name || participant.identity : participant.identity;

  return (
    <li className="flex min-h-16 items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={`h-3 w-3 shrink-0 rounded-full ${isSpeaking ? 'bg-[#2ecc71]' : isMuted ? 'bg-[#e74c3c]' : 'bg-[#35180f] shadow-[inset_0_0_0_1px_rgba(139,107,46,0.8)]'}`}
        />
        <span className="min-w-0">
          <span className="block truncate text-lg font-semibold text-text-premium">{name}</span>
          <span className="block text-sm text-[#bdb7a6]">{isSpeaking ? 'Hablando' : isMuted ? 'Silenciado para ti' : 'Con voz'}</span>
        </span>
      </span>

      <button
        type="button"
        onClick={toggleMute}
        disabled={!hasTrack}
        aria-pressed={isMuted}
        aria-label={isMuted ? `Activar voz de ${name}` : `Silenciar a ${name}`}
        className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg border px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:cursor-not-allowed disabled:opacity-40 ${
          isMuted ? 'border-[#e74c3c]/70 bg-[#2a0f0c] text-[#f6d5d0]' : 'border-[#8b6b2e]/80 text-text-premium hover:border-brand-gold'
        }`}
      >
        {isMuted && <VolumeX className="h-5 w-5" aria-hidden="true" />}
        {isMuted ? 'Silenciado' : 'Silenciar'}
      </button>
    </li>
  );
}
