"use client";

import { useState } from "react";
import { searchUsers, sendFriendRequest } from "@/app/actions/social-actions";

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 3) return;
    setIsSearching(true);
    const data = await searchUsers(query);
    setResults(data);
    setIsSearching(false);
  };

  const handleAddFriend = async (id: string) => {
    await sendFriendRequest(id);
    alert("Solicitud enviada");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por usuario..." 
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400 outline-none transition-all"
        />
        <button 
          type="submit" 
          disabled={isSearching}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg font-bold transition-colors"
        >
          {isSearching ? "..." : "Buscar"}
        </button>
      </form>

      {results.length > 0 ? (
        <ul className="space-y-2">
          {results.map(user => (
            <li key={user.id} className="flex items-center justify-between p-3 bg-slate-800/80 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full overflow-hidden">
                  <img src={user.avatar_url || "/default-avatar.png"} alt={user.username} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{user.username}</p>
                  <p className="text-xs text-slate-400">Nivel {user.level}</p>
                </div>
              </div>
              <button 
                onClick={() => handleAddFriend(user.id)}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold p-2"
              >
                + Añadir
              </button>
            </li>
          ))}
        </ul>
      ) : (
        query.length >= 3 && !isSearching && <p className="text-slate-400 text-sm">No se encontraron jugadores.</p>
      )}
    </div>
  );
}
