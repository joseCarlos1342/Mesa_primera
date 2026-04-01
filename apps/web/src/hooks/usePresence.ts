"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export type UserStatus = 'online' | 'offline' | 'in-game';

// Global state to share between all usePresence hooks
let globalStatusMap: Record<string, UserStatus> = {};
const subscribers = new Set<(state: Record<string, UserStatus>) => void>();
let globalChannel: RealtimeChannel | null = null;

export function usePresence(_friends: any[]) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatus>>(globalStatusMap);
  const supabase = createClient();

  useEffect(() => {
    // Register this hook's setter to receive updates
    subscribers.add(setOnlineUsers);

    // Initialize the shared channel if it doesn't exist
    if (!globalChannel) {
      globalChannel = supabase.channel('online-users', {
        config: {
          presence: {
            key: 'status',
          },
        },
      });

      const channel = globalChannel as RealtimeChannel;

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
          
          globalStatusMap = statusMap;
          subscribers.forEach(fn => fn(statusMap));
        })
        .on('presence', { event: 'join' }, () => {
          // Join events handled by sync
        })
        .on('presence', { event: 'leave' }, () => {
          // Leave events handled by sync
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await channel.track({
                user_id: user.id,
                online_at: new Date().toISOString(),
                status: 'online',
              });
            }
          }
        });
    } else {
      // If channel already exists, just trigger an immediate update with current global state
      setOnlineUsers({ ...globalStatusMap });
    }

    return () => {
      subscribers.delete(setOnlineUsers);
      // We keep the globalChannel alive as long as the app is running 
      // or until specifically unmounted. Or we could check if subscribers.size === 0.
      if (subscribers.size === 0 && globalChannel) {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
      }
    };
  }, [supabase]); // Re-run if client changes (unlikely with singleton)

  const getStatus = (userId: string): UserStatus => {
    return onlineUsers[userId] || 'offline';
  };

  return { getStatus, onlineUsers };
}
