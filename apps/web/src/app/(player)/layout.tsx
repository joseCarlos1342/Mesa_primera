import Link from 'next/link';
import { SupportTrigger } from "@/components/SupportTrigger";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SupportChat } from "@/components/SupportChat";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PresenceTracker } from "@/components/PresenceTracker";
import { PlayerAppLockWrapper } from "@/components/providers/PlayerAppLockWrapper";
import { createClient } from "@/utils/supabase/server";
import { getAvatarSvg } from "@/utils/avatars";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    profile = p;
  }

  return (
    <PlayerAppLockWrapper userId={user?.id ?? ''}>
    <div className="player-layout min-h-screen bg-slate-950 text-text-premium relative flex flex-col font-sans selection:bg-brand-gold/30">
      {/* Premium Casino Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_#0a2a1f_100%)]" />
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3%3C/filter%3%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3%3C/svg%3")` }} 
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full px-4 py-4 md:px-8 md:py-3 flex items-center justify-between bg-black/60 backdrop-blur-2xl border-b-2 border-brand-gold/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pt-safe">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center gap-3 bg-white/5 border border-white/10 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/10 transition-colors active:scale-95 group">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-brand-gold/30 overflow-hidden relative shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-brand-gold-dark/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {profile?.avatar_url ? (
                getAvatarSvg(profile.avatar_url) ? (
                  <div className="w-full h-full scale-[1.3]">
                    {getAvatarSvg(profile.avatar_url)}
                  </div>
                ) : (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-xs font-bold text-brand-gold">
                  {profile?.username ? profile.username[0].toUpperCase() : 'M'}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase italic text-text-premium leading-none">
                {profile?.username || 'Invitado'}
              </span>
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-brand-gold mt-0.5">
                Ver Perfil
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Support Trigger Button only for logged in users */}
            {user && <SupportTrigger />}

            {user && <NotificationCenter userId={user.id} />}
            <SignOutButton 
              variant="danger" 
              className="h-12 w-12 md:h-16 md:w-auto px-0 sm:px-6 flex items-center justify-center min-w-[3rem]" 
            />
          </div>
        </div>
      </header>
      
      <main className="relative flex-1 p-3 md:p-8 pb-24 md:pb-28 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </main>

      <BottomNav />
      <PWAInstallPrompt />
      {user && <PresenceTracker />}
      {user && <SupportChat userId={user.id} />}
    </div>
    </PlayerAppLockWrapper>
  );
}
