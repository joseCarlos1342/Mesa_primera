'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useIsSpeaking,
  BarVisualizer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff } from 'lucide-react';

interface VoiceChatProps {
  roomName: string;
  username: string;
}

export function VoiceChat({ roomName, username }: VoiceChatProps) {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');

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
      className="flex flex-col-reverse sm:flex-row items-center gap-2 p-2 bg-slate-900/80 backdrop-blur-2xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full"
    >
      <div className="flex flex-wrap items-center gap-2 justify-center pl-2 sm:pl-4 pr-2">
         <ActiveSpeakers />
      </div>

      <RoomAudioRenderer />
      
      <CustomMicToggle />
    </LiveKitRoom>
  );
}

function CustomMicToggle() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isPending, setIsPending] = useState(false);

  const toggleMic = async () => {
    if (!localParticipant || isPending) return;
    
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
      {/* Visualizador de Onda del Micrófono Local */}
      {isMicrophoneEnabled && localParticipant && (
        <div className="hidden sm:block h-10 w-24 bg-slate-950/50 rounded-full overflow-hidden relative border border-emerald-500/20">
           <BarVisualizer 
              trackRef={{ participant: localParticipant, source: Track.Source.Microphone }} 
              className="absolute inset-0 w-full h-full flex items-center justify-center gap-1"
              barCount={5}
              style={{ '--lk-fg': 'rgb(52, 211, 153)' } as React.CSSProperties}
           />
        </div>
      )}

      <button 
        onClick={toggleMic}
        disabled={isPending}
        className={`group relative flex items-center justify-center gap-3 pr-6 pl-2 h-12 md:h-14 rounded-full font-bold text-sm md:text-base border shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${isMicrophoneEnabled 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50' 
            : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50'
          }`}
        title="Activar o desactivar micrófono"
      >
        {/* OFF STATE */}
        {!isMicrophoneEnabled && (
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-red-500/20 text-red-400 group-hover:bg-red-500/30 transition-colors">
                 <MicOff className="w-4 h-4 md:w-5 md:h-5" />
             </div>
             <span className="hidden sm:inline-block tracking-widest uppercase text-xs md:text-sm">Silenciado</span>
          </div>
        )}

        {/* ON STATE */}
        {isMicrophoneEnabled && (
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 transition-colors relative">
                 <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/30 opacity-75"></div>
                 <Mic className="w-4 h-4 md:w-5 md:h-5 relative z-10" />
             </div>
             <span className="hidden sm:inline-block tracking-widest uppercase text-xs md:text-sm">Mic Activo</span>
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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isSpeaking ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]' : 'bg-[#1a1a2e] text-[var(--text-primary)]'}`}>
      <span className={`w-2.5 h-2.5 rounded-full transition-colors ${isSpeaking ? 'bg-[var(--bg-primary)] animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.5)]' : 'bg-[var(--text-secondary)]'}`} />
      {participant.name || participant.identity}
    </div>
  );
}
