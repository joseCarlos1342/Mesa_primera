import { Lobby } from "@/components/game/Lobby";

export default function PlayerPage() {
  return (
    <div className="min-h-full py-20 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <Lobby />
      </div>
    </div>
  );
}
