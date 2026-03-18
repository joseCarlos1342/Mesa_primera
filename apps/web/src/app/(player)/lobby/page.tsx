import { Lobby } from "@/components/game/Lobby";

export default function LobbyPage() {
  return (
    <div className="min-h-full py-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-5xl mx-auto space-y-12">
        <Lobby />
      </div>
    </div>
  );
}
