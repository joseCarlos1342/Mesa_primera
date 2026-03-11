import { Suspense } from "react";
import { getFriendships } from "@/app/actions/social-actions";
import { FriendsList } from "./_components/friends-list";
import { FriendRequests } from "./_components/friend-requests";
import { SearchUsers } from "./_components/search-users";

export default async function FriendsPage() {
  const { friends, pendingIncoming, pendingOutgoing } = await getFriendships();

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in zoom-in duration-300">
      <div>
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Comunidad y Amigos
        </h1>
        <p className="text-slate-400">Encuentra jugadores, envía solicitudes y mira quién está conectado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold mb-4 text-emerald-400">Tus Amigos</h2>
            <Suspense fallback={<div>Cargando amigos...</div>}>
              <FriendsList friends={friends} />
            </Suspense>
          </section>

          <section className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold mb-4 text-emerald-400">Solicitudes</h2>
            <FriendRequests incoming={pendingIncoming} outgoing={pendingOutgoing} />
          </section>
        </div>

        <div className="md:col-span-1 space-y-8">
          <section className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold mb-4 text-emerald-400">Buscar Jugadores</h2>
            <SearchUsers />
          </section>
        </div>
      </div>
    </div>
  );
}
