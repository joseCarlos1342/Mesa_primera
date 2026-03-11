import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SupportChat } from "@/components/SupportChat";
import { BottomNav } from "@/components/navigation/BottomNav";
import { createClient } from "@/utils/supabase/server";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="player-layout min-h-screen bg-slate-950 text-white relative flex flex-col">
      <header className="absolute top-6 right-6 z-50 flex items-center gap-4">
        {user && <NotificationCenter userId={user.id} />}
        <SignOutButton />
      </header>
      
      <main className="flex-1 pb-24 md:pb-32">
        {children}
      </main>

      <BottomNav />
      {user && <SupportChat userId={user.id} />}
    </div>
  );
}
