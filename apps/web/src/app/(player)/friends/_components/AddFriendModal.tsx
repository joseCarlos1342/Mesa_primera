"use client";

import { useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import { searchUsers, sendFriendRequest } from "@/app/actions/social-actions";
import { AuthButton, AuthField } from "@/components/auth/AuthForm";
import { PlayerSheet } from "@/components/player/PlayerSheet";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FoundUser {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  level?: number;
}

export function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3) return;

    setLoading(true);
    const users = (await searchUsers(query.trim())) as FoundUser[];
    setResults(users);
    setSearched(true);
    setLoading(false);
  };

  const handleAddFriend = async (userId: string) => {
    setRequesting(userId);
    setError(null);
    const res = await sendFriendRequest(userId);
    if (res.success) {
      setSent((prev) => new Set(prev).add(userId));
    } else {
      setError(res.error || "No pudimos enviar la solicitud.");
    }
    setRequesting(null);
  };

  return (
    <PlayerSheet open={isOpen} onClose={onClose} title="Agregar amigo" description="Búscalo por nombre, apodo o celular." closeLabel="Cerrar búsqueda">
      <form onSubmit={handleSearch} className="flex items-start gap-2 pt-1" role="search">
        <div className="min-w-0 flex-1">
          <AuthField
            label="Buscar jugador"
            type="search"
            placeholder="Nombre, apodo o teléfono..."
            value={query}
            data-autofocus
            onChange={(e) => setQuery(e.target.value)}
            hint={query.length > 0 && query.trim().length < 3 ? "Escribe al menos 3 letras o números." : undefined}
          />
        </div>
        <AuthButton
          type="submit"
          aria-label="Buscar"
          pending={loading}
          disabled={query.trim().length < 3}
          icon={!loading ? <Search className="h-5 w-5" aria-hidden="true" /> : undefined}
          className="mt-8 w-14! shrink-0 px-0!"
        />
      </form>

      {error && (
        <p role="alert" className="mt-4 text-base font-semibold text-[#f08a7e]">
          {error}
        </p>
      )}

      <div className="mt-5" aria-live="polite">
        {results.length > 0 ? (
          <ul className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30">
            {results.map((u) => {
              const isSent = sent.has(u.id);
              return (
                <li key={u.id} className="flex min-h-[4.5rem] items-center gap-3 py-3">
                  <PlayerAvatar avatar={u.avatar_url} name={u.username} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-text-premium">{u.username}</p>
                    <p className="truncate text-base text-[#bdb7a6]">{u.full_name || `Nivel ${u.level}`}</p>
                  </div>
                  {isSent ? (
                    <span className="inline-flex min-h-12 items-center gap-1.5 text-base font-semibold text-[#7fe0a6]">
                      <Check className="h-5 w-5" aria-hidden="true" />
                      Enviada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddFriend(u.id)}
                      disabled={requesting === u.id}
                      aria-label={`Enviar solicitud a ${u.username}`}
                      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg border border-[#8b6b2e]/80 px-3 text-base font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:opacity-60"
                    >
                      <UserPlus className="h-5 w-5" aria-hidden="true" />
                      {requesting === u.id ? 'Enviando…' : 'Agregar'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : searched && !loading ? (
          <p className="py-6 text-center text-lg text-[#bdb7a6]">No se encontraron jugadores.</p>
        ) : null}
      </div>
    </PlayerSheet>
  );
}
