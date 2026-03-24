'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    setMounted(true);
    const handleOpenModal = () => setIsAudioModalOpen(true);
    window.addEventListener('open-player-audio-modal', handleOpenModal);
    return () => window.removeEventListener('open-player-audio-modal', handleOpenModal);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/livekit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomName, username }),
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
    return <div className="text-xs text-[var(--text-secondary)]">Conectando canal de voz...</div>;
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
          ? "p-2 bg-[#0c1220]/90 backdrop-blur-xl border border-[#d4af37]/20 shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_1px_10px_rgba(212,175,55,0.05)] rounded-[2rem]" 
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm group"
      >
        <div className="bg-[#0c1220] border-2 border-[#d4af37] p-8 rounded-3xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
           <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4af37] to-[#8a6d29] flex items-center justify-center animate-bounce">
              <VolumeX className="w-8 h-8 text-white" />
           </div>
           <p className="text-[#fdf0a6] font-bold text-center max-w-xs uppercase tracking-widest text-sm">
             El navegador bloqueó el audio automático.<br/>Haz clic para escuchar a los jugadores.
           </p>
           <div className="mt-2 px-6 py-3 bg-[#d4af37] text-black font-black uppercase rounded-xl hover:scale-105 transition-transform">
             CONECTAR SONIDO
           </div>
        </div>
      </StartAudio>

      <CustomMicToggle />

      {mounted && <PlayerAudioModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} />}
    </LiveKitRoom>
  );
}

function CustomMicToggle() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const connectionState = useConnectionState();
  const [isPending, setIsPending] = useState(false);

  const isConnected = connectionState === ConnectionState.Connected;

  const toggleMic = async () => {
    if (!localParticipant || isPending || !isConnected) return;
    
    // Validar si el navegador soporta acceso al micrófono (requiere HTTPS o localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Error: Tu navegador bloqueó el acceso al micrófono porque esta conexión no es segura (HTTPS). Si juegas en red local, usa 'localhost' o configura un túnel seguro.");
      return;
    }

    setIsPending(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e: any) {
      console.error('Failed to toggle mic', e);
      if (e.message?.includes("Permission denied")) {
        alert("Denegaste el permiso del micrófono. Debes habilitarlo en los ajustes del navegador.");
      } else {
        alert("Error al intentar activar el micrófono. Verifica tus permisos o hardware.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Visualizer removed */}

      <button 
        onClick={toggleMic}
        disabled={isPending || !isConnected}
        className={`group relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 landscape:w-10 landscape:h-10 md:landscape:w-16 md:landscape:h-16 rounded-full transition-all hover:-translate-y-0.5 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)]
          ${isMicrophoneEnabled 
            ? 'bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#14532d] hover:from-[#86efac] hover:via-[#22c55e] border border-[#86efac]/50 border-b-[4px] border-b-[#064e3b] text-white' 
            : 'bg-gradient-to-b from-[#f87171] via-[#dc2626] to-[#991b1b] hover:from-[#fca5a5] hover:via-[#ef4444] border border-[#fca5a5]/50 border-b-[4px] border-b-[#7f1d1d] text-white'
          }`}
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        title="Activar o desactivar micrófono"
      >
        {/* OFF STATE */}
        {!isMicrophoneEnabled && (
          <MicOff className="w-5 h-5 md:w-7 md:h-7 drop-shadow-md" />
        )}

        {/* ON STATE */}
        {isMicrophoneEnabled && (
          <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping bg-emerald-300 opacity-60"></div>
              <Mic className="w-5 h-5 md:w-7 md:h-7 relative z-10 drop-shadow-md text-[#fdf0a6]" />
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
        ? 'bg-gradient-to-br from-[#1b253b] to-[#0c1220] border-[#4ade80]/40 text-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]' 
        : 'bg-[#1b253b]/50 border-white/5 text-slate-400 opacity-70'
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

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0c1220] border-2 border-[#d4af37]/50 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(212,175,55,0.2)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="p-4 border-b border-[#d4af37]/20 flex justify-between items-center bg-[#090e18]">
          <h2 className="text-xl font-black text-[#fdf0a6] uppercase tracking-widest flex items-center gap-2" style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }}>
            <Mic className="w-6 h-6 text-[#d4af37]" />
            Audio de Jugadores
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
          {remoteParticipants.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-8">No hay otros jugadores en la sala.</p>
          ) : (
            remoteParticipants.map(p => (
              <PlayerAudioRow key={p.identity} participant={p} />
            ))
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

function PlayerAudioRow({ participant }: { participant: any }) {
  // Volume state strictly for local UI feedback
  const [isMuted, setIsMuted] = useState(false);
  const isSpeaking = useIsSpeaking(participant);
  
  // Gets the audio track publication for this remote participant
  const audioTrack = participant.getTrackPublication(Track.Source.Microphone);

  const toggleMute = () => {
    if (audioTrack && audioTrack.track) {
      // For remote tracks, we can disable playback by attaching/detaching or setting volume
      // In LiveKit React, the actual <audio> element is managed by <RoomAudioRenderer>.
      // The easiest way to mute a specific remote track locally is to set its HTML element volume to 0.
      const htmlAudioElements = audioTrack.track.attachedElements as HTMLMediaElement[];
      htmlAudioElements.forEach(el => {
        el.muted = !isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-[#1b253b]/50 border border-white/5 rounded-xl">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full border border-black/50 transition-colors min-w-3
          ${isSpeaking 
            ? 'bg-gradient-to-br from-[#4ade80] to-[#16a34a] shadow-[0_0_10px_rgba(74,222,128,0.5)]' 
            : 'bg-slate-700'
          }`} 
        />
        <span className="text-white font-bold text-lg truncate max-w-[150px]">
          {participant.name !== 'Jugador' ? participant.name || participant.identity : participant.identity}
        </span>
      </div>

      <button 
        onClick={toggleMute}
        className={`px-4 py-2 rounded-lg font-black text-sm uppercase tracking-wider transition-all shadow-md active:translate-y-0.5
          ${isMuted 
            ? 'bg-gradient-to-b from-red-500 to-red-700 text-white border border-red-400 border-b-[4px] border-b-red-900' 
            : 'bg-gradient-to-b from-slate-600 to-slate-800 text-slate-200 border border-slate-500 border-b-[4px] border-b-black hover:from-slate-500 hover:to-slate-700'
          }
        `}
      >
        {isMuted ? 'Silenciado' : 'Silenciar'}
      </button>
    </div>
  );
}
