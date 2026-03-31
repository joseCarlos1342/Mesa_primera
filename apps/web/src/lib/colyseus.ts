import { Client } from "@colyseus/sdk";

const getColyseusUrl = (): string => {
  // Always prefer the explicit env var if it is set (works in both server and browser
  // because NEXT_PUBLIC_* vars are inlined into the client bundle at build time).
  if (process.env.NEXT_PUBLIC_GAME_SERVER_URL) {
    return process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  }

  if (typeof window !== 'undefined') {
    // Colyseus 0.15+ Matchmaking relies on HTTP/HTTPS for fetch requests
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    let host = window.location.hostname;
    // Force 127.0.0.1 to avoid IPv6 vs IPv4 fetch mismatches on localhost
    if (host === 'localhost') host = '127.0.0.1';
    return `${protocol}//${host}:2567`;
  }

  return "http://127.0.0.1:2567";
};

export const client = new Client(getColyseusUrl());
