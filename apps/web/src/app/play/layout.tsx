import "../(player)/player.css";

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <div className="player-layout min-h-[100dvh]">{children}</div>;
}
