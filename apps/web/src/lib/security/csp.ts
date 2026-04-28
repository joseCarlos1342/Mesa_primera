type BuildContentSecurityPolicyOptions = {
  nonce: string
  isDevelopment: boolean
}

const supabaseOrigin = 'https://bhwchdzfvhhhuxovrqio.supabase.co'
const defaultGameServerOrigin = 'https://vps24726.cubepath.net'
const defaultSocketOrigin = 'https://vps24726.cubepath.net'
const livekitWss = 'wss://mesaprimera-59x1pueh.livekit.cloud'
const livekitHttps = 'https://mesaprimera-59x1pueh.livekit.cloud'

function normalizeOrigin(value: string | undefined, fallback: string): string {
  try {
    return new URL(value || fallback).origin
  } catch {
    return fallback
  }
}

function toWebSocketOrigin(origin: string): string {
  if (origin.startsWith('https://')) return `wss://${origin.slice('https://'.length)}`
  if (origin.startsWith('http://')) return `ws://${origin.slice('http://'.length)}`
  return origin
}

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
}: BuildContentSecurityPolicyOptions) {
  const gameServerOrigin = normalizeOrigin(process.env.GAME_SERVER_URL, defaultGameServerOrigin)
  const socketOrigin = normalizeOrigin(process.env.SOCKET_URL, defaultSocketOrigin)
  const connectSrc = [
    `'self'`,
    supabaseOrigin,
    'wss://bhwchdzfvhhhuxovrqio.supabase.co',
    gameServerOrigin,
    toWebSocketOrigin(gameServerOrigin),
    socketOrigin,
    toWebSocketOrigin(socketOrigin),
    livekitWss,
    livekitHttps,
    'https://api.twilio.com',
    'https://verify.twilio.com',
    'https://basemaps.cartocdn.com',
    'https://*.basemaps.cartocdn.com',
  ]

  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    'https://static.cloudflareinsights.com',
    'https://challenges.cloudflare.com',
  ]

  if (isDevelopment) {
    scriptSrc.push(`'unsafe-eval'`)
  }

  const styleSrc = [
    `'self'`,
    'https://fonts.googleapis.com',
    isDevelopment ? `'unsafe-inline'` : `'nonce-${nonce}'`,
  ]

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' ${supabaseOrigin} https://www.transparenttextures.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com data: blob:`,
    `connect-src ${Array.from(new Set(connectSrc)).join(' ')}`,
    `media-src 'self'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `frame-src 'self' ${livekitWss} https://challenges.cloudflare.com`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ].join('; ')
}