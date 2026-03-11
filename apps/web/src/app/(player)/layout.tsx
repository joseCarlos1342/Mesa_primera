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
      <header className="sticky top-0 z-50 w-full px-4 py-4 md:px-8 md:py-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--accent-gold)] rounded-2xl flex items-center justify-center font-black text-2xl text-[var(--bg-primary)] shadow-lg shadow-yellow-500/10 rotate-3">M</div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-black tracking-tighter uppercase italic text-white">Mesa Primera</span>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-400">Club Social</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && <NotificationCenter userId={user.id} />}
          <SignOutButton className="!h-16 !px-6" />
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-32 max-w-5xl mx-auto w-full">
        {children}
      </main>

      <BottomNav />
      {user && <SupportChat userId={user.id} />}
    </div>
  );
}
