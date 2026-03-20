"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimePresenceState } from "@supabase/supabase-js";

export type UserStatus = 'online' | 'offline' | 'in-game';

export function usePresence(friends: any[]) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatus>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!friends || friends.length === 0) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'status',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const statusMap: Record<string, UserStatus> = {};
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((p) => {
            if (p.user_id) {
              statusMap[p.user_id] = p.status || 'online';
            }
          });
        });
        
        setOnlineUsers(statusMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('join', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('leave', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
              status: 'online', // Could be 'in-game' if derived from path
            });
          }
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [friends]);

  const getStatus = (userId: string): UserStatus => {
    return onlineUsers[userId] || 'offline';
  };

  return { getStatus, onlineUsers };
}
