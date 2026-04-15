'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SocketBroadcastEvent } from '@/lib/broadcast';

/**
 * Global Socket.IO client for `/notifications` namespace.
 * Connects once per player session, registers user for targeted notifications,
 * and dispatches a custom DOM event when a broadcast arrives so that
 * NotificationCenter can pick it up without tight coupling.
 */
export function useNotificationSocket(userId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);

  const getSocketUrl = useCallback(() => {
    return (
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' &&
        (window as any).__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_SOCKET_URL) ||
      'http://localhost:2568'
    );
  }, []);

  useEffect(() => {
    if (!userId) return;

    const socketUrl = getSocketUrl();
    const socket = io(`${socketUrl}/notifications`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register', userId);
    });

    socket.on('notification', (data: SocketBroadcastEvent) => {
      // Dispatch a custom event so NotificationCenter can deduplicate
      window.dispatchEvent(
        new CustomEvent('socket-notification', { detail: data })
      );
    });

    socket.on('disconnect', (reason) => {
      console.log(`[NotifSocket] Disconnected: ${reason}`);
    });

    socket.on('reconnect', () => {
      socket.emit('register', userId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, getSocketUrl]);

  return socketRef;
}
