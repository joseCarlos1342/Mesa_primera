"use client";

import { acceptFriendRequest, removeFriendship } from "@/app/actions/social-actions";

export function FriendRequests({ incoming, outgoing }: { incoming: any[], outgoing: any[] }) {
  const handleAccept = async (id: string) => {
    await acceptFriendRequest(id);
  };

  const handleDecline = async (id: string) => {
    await removeFriendship(id);
  };

  if (incoming.length === 0 && outgoing.length === 0) {
    return <p className="text-slate-400">No hay solicitudes pendientes.</p>;
  }

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Recibidas</h3>
          <ul className="space-y-2">
            {incoming.map((f) => (
              <li key={f.friendshipId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                  <img 
                    src={f.profile?.avatar_url || "/default-avatar.png"} 
                    alt={f.profile?.username} 
                    className="w-10 h-10 rounded-full object-cover" 
                  />
                  <span>{f.profile?.username}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAccept(f.friendshipId)}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-sm font-bold rounded-md transition-colors"
                  >
                    Aceptar
                  </button>
                  <button 
                    onClick={() => handleDecline(f.friendshipId)}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm font-bold rounded-md transition-colors"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Enviadas</h3>
          <ul className="space-y-2">
            {outgoing.map((f) => (
              <li key={f.friendshipId} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3 opacity-70">
                  <img 
                    src={f.profile?.avatar_url || "/default-avatar.png"} 
                    alt={f.profile?.username} 
                    className="w-8 h-8 rounded-full object-cover grayscale" 
                  />
                  <span className="text-sm">{f.profile?.username}</span>
                </div>
                <button 
                  onClick={() => handleDecline(f.friendshipId)}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
