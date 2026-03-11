'use client';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export function AdminBroadcastPanel() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:2568';
    const s = io(`${socketUrl}/notifications`, {
      withCredentials: true,
    });
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body || !socket) return;
    
    setStatus('Enviando...');
    
    // We emit the admin broadcast event to the server
    socket.emit('admin:broadcast', { title, body });
    
    setStatus('¡Notificación enviada a todos los usuarios!');
    setTitle('');
    setBody('');
    
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl p-6 max-w-md w-full shadow-lg">
      <h2 className="text-xl font-bold text-[var(--accent-gold)] mb-4 flex items-center gap-2">
        📢 Transmisión Global
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Envía una notificación in-app y Push a todos los jugadores registrados.
      </p>

      <form onSubmit={handleBroadcast} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Título</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-[#1a1a2e] border border-[var(--border-glow)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--accent-gold)]"
            placeholder="Ej: ¡Nuevo Torneo Disponible!"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Mensaje</label>
          <textarea 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            className="w-full bg-[#1a1a2e] border border-[var(--border-glow)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--accent-gold)] resize-none"
            placeholder="Escribe el contenido de la notificación..."
          />
        </div>

        <button 
          type="submit" 
          disabled={!title || !body || !socket}
          className="w-full mt-2 bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold py-3 rounded-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          Enviar a Todos
        </button>

        {status && (
          <p className="text-center text-sm mt-2 text-[var(--accent-green)] font-medium">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
