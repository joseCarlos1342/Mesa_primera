'use client';

import { useEffect } from 'react';

/**
 * Suppresses known harmless errors in development, such as the LiveKit 
 * DataChannel "lossy" error caused by React Strict Mode double-mounting.
 */
export function ClientErrorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        // Suppress LiveKit/WebRTC DataChannel "lossy" error that happens during fast refresh
        if (typeof args[0] === 'string' && args[0].includes('Unknown DataChannel error on lossy')) {
          return;
        }
        originalError(...args);
      };
      
      return () => {
        console.error = originalError;
      };
    }
  }, []);

  return null;
}
