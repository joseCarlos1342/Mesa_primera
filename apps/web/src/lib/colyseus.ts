import { Client } from "@colyseus/sdk";

const getColyseusUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    return `${protocol}//${host}:2567`;
  }
  return process.env.NEXT_PUBLIC_GAME_SERVER_URL || "ws://0.0.0.0:2567";
};

export const getHttpColyseusUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname;
    return `${protocol}//${host}:2567`;
  }
  return "http://0.0.0.0:2567";
}

export const client = new Client(getColyseusUrl());
