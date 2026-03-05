export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="player-layout min-h-screen bg-green-900 text-white">
      <main className="h-full">{children}</main>
    </div>
  );
}
