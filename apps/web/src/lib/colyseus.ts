import { Client } from "@colyseus/sdk";

const getColyseusUrl = () => {
  // 1. Check build-time NEXT_PUBLIC_ var (works if set in Vercel env at build)
  const buildTimeUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (buildTimeUrl) return buildTimeUrl;

  // 2. Check runtime injection from layout.tsx (SSR-injected window global)
  if (typeof window !== 'undefined') {
    const runtimeUrl = (window as any).__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_GAME_SERVER_URL;
    if (runtimeUrl) return runtimeUrl;

    // 3. Fallback: construct from window.location (only works if game server is same host)
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    let host = window.location.hostname;
    if (host === 'localhost') host = '127.0.0.1';
    return `${protocol}//${host}:2567`;
  }

  // 4. Server-side fallback (non-NEXT_PUBLIC_ variant)
  return process.env.GAME_SERVER_URL || "http://127.0.0.1:2567";
};

export const client = new Client(getColyseusUrl());
