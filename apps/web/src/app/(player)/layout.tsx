import { SignOutButton } from "@/components/auth/sign-out-button";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="player-layout min-h-screen bg-slate-950 text-white relative">
      <header className="absolute top-6 right-6 z-50">
        <SignOutButton />
      </header>
      <main className="h-full">{children}</main>
    </div>
  );
}
