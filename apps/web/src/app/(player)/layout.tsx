import { SupportTrigger } from "@/components/SupportTrigger";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SupportChat } from "@/components/SupportChat";
import { BottomNav } from "@/components/navigation/BottomNav";
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
    <div className="player-layout min-h-screen bg-[#020617] text-white relative flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full px-4 py-2 md:px-8 md:py-3 flex items-center justify-between bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <a href="/profile" className="flex items-center gap-3 bg-white/5 border border-white/10 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/10 transition-colors active:scale-95 group">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-white/10 overflow-hidden relative shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {profile?.avatar_url ? (
                getAvatarSvg(profile.avatar_url) ? (
                  <div className="w-full h-full scale-[1.3]">
                    {getAvatarSvg(profile.avatar_url)}
                  </div>
                ) : (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-xs font-bold text-indigo-400">
                  {profile?.username ? profile.username[0].toUpperCase() : 'M'}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase italic text-white leading-none">
                {profile?.username || 'Invitado'}
              </span>
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-indigo-400 mt-0.5">
                Ver Perfil
              </span>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Support Trigger Button */}
            <SupportTrigger />

            {user && <NotificationCenter userId={user.id} />}
            <SignOutButton className="!h-12 !w-12 md:!h-14 md:!w-auto !p-0 sm:!px-6 !rounded-2xl !bg-red-500/10 hover:!bg-red-500/20 !border-red-500/20 !text-red-400 active:scale-90 transition-all flex items-center justify-center sm:!aspect-auto min-w-[3rem]" />
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-3 md:p-8 pb-20 md:pb-28 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </main>

      <BottomNav />
      {user && <SupportChat userId={user.id} />}
    </div>
  );
}
