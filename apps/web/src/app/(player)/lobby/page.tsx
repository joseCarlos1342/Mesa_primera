import { Lobby } from "@/components/game/Lobby";

export default function LobbyPage() {
  return (
    <div className="min-h-full py-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-black italic text-indigo-400 uppercase tracking-tighter">Mesas Disponibles</h1>
          <p className="text-slate-500 font-medium">Elige tu mesa y empieza a jugar</p>
        </div>
        <Lobby />
      </div>
    </div>
  );
}
