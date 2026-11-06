import type { Metadata } from 'next';
import "./player.css";
import { SupportTrigger } from "@/components/SupportTrigger";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SupportChat } from "@/components/SupportChat";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PresenceTracker } from "@/components/PresenceTracker";
import { PlayerAppLockWrapper } from "@/components/providers/PlayerAppLockWrapper";
import { NotificationSocketProvider } from "@/components/providers/NotificationSocketProvider";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { OrientationPortrait } from "@/components/OrientationPortrait";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { createClient } from "@/utils/supabase/server";
import { OneSignalPushOptIn } from "@/components/OneSignalPushOptIn";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
    <OrientationPortrait />
    <div className="player-layout relative flex min-h-dvh flex-col bg-[#0a0a0a] font-sans text-text-premium selection:bg-brand-gold/35 selection:text-text-premium">
      <PlayerHeader
        username={profile?.username}
        avatar={profile?.avatar_url}
        actions={
          user && (
            <>
              <SupportTrigger />
              <NotificationCenter userId={user.id} />
              <OneSignalPushOptIn userId={user.id} compact />
            </>
          )
        }
      />

      <div className="flex-1 lg:pl-28">
        <main
          id="contenido-principal"
          className="mx-auto w-full max-w-[72rem] px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-7 sm:px-6 lg:px-14 lg:pb-16 lg:pt-10"
        >
          {children}
        </main>
      </div>

      <BottomNav />
      <PWAInstallPrompt />
      {user && <PresenceTracker />}
      {user && <SupportChat userId={user.id} />}
      {user && <NotificationSocketProvider userId={user.id} />}
      {user && <BroadcastBanner userId={user.id} />}
    </div>
    </PlayerAppLockWrapper>
  );
}
