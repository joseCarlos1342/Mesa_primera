import { Client } from "@colyseus/sdk";

const getColyseusUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.hostname;
    // Force 127.0.0.1 to avoid IPv6 vs IPv4 fetch mismatches on localhost
    if (host === 'localhost') host = '127.0.0.1';
    return `${protocol}//${host}:2567`;
  }
  return process.env.NEXT_PUBLIC_GAME_SERVER_URL || "ws://127.0.0.1:2567";
};

export const getHttpColyseusUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    let host = window.location.hostname;
    if (host === 'localhost') host = '127.0.0.1';
    return `${protocol}//${host}:2567`;
  }
  return process.env.NEXT_PUBLIC_GAME_SERVER_URL?.replace('ws', 'http') || "http://127.0.0.1:2567";
}

export const client = new Client(getColyseusUrl());
