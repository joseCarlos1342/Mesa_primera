"use client";

import { removeFriendship } from "@/app/actions/social-actions";

export function FriendsList({ friends }: { friends: any[] }) {
  const handleRemove = async (id: string) => {
    if (confirm("¿Seguro que quieres eliminar a este amigo?")) {
      await removeFriendship(id);
    }
  };

  if (!friends || friends.length === 0) {
    return <p className="text-slate-400">Aún no tienes amigos agregados.</p>;
  }

  return (
    <ul className="space-y-3">
      {friends.map((f) => (
        <li key={f.friendshipId} className="flex items-center justify-between p-4 bg-slate-800/80 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <img 
                src={f.profile?.avatar_url || "/default-avatar.png"} 
                alt={f.profile?.username} 
                className="w-full h-full rounded-full object-cover border-2 border-slate-700" 
              />
              {/* Fake online status for now, ideally wired to Supabase Presence */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800"></div>
            </div>
            <div>
              <p className="font-bold text-lg text-slate-100">{f.profile?.username}</p>
              <p className="text-sm text-slate-400">Nivel {f.profile?.level || 1}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors">
              Retar
            </button>
            <button 
              onClick={() => handleRemove(f.friendshipId)}
              className="px-3 py-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-sm transition-colors"
              title="Eliminar amigo"
            >
              x
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
