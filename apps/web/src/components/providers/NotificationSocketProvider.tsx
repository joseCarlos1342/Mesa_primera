'use client';

import { useNotificationSocket } from '@/hooks/useNotificationSocket';

/** Invisible component that keeps the /notifications Socket.IO connection alive */
export function NotificationSocketProvider({ userId }: { userId: string }) {
  useNotificationSocket(userId);
  return null;
}
