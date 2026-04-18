type BuildContentSecurityPolicyOptions = {
  nonce: string
  isDevelopment: boolean
}

const supabaseOrigin = 'https://bhwchdzfvhhhuxovrqio.supabase.co'
const livekitWss = 'wss://mesaprimera-59x1pueh.livekit.cloud'
const livekitHttps = 'https://mesaprimera-59x1pueh.livekit.cloud'

function toWebSocketOrigin(origin: string) {
  if (origin.startsWith('https://')) return origin.replace(/^https:/, 'wss:')
  if (origin.startsWith('http://')) return origin.replace(/^http:/, 'ws:')
  return origin
}

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
}: BuildContentSecurityPolicyOptions) {
  const gameServerOrigin =
    process.env.GAME_SERVER_URL ||
    process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
    (isDevelopment ? 'http://127.0.0.1:2567' : 'https://vps24726.cubepath.net')
  const gameServerWsOrigin = toWebSocketOrigin(gameServerOrigin)
  const socketOrigin =
    process.env.SOCKET_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    gameServerOrigin
  const socketWsOrigin = toWebSocketOrigin(socketOrigin)

  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    'https://static.cloudflareinsights.com',
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
    `img-src 'self' ${supabaseOrigin} https://www.transparenttextures.com data: blob:`,
    `connect-src 'self' ${supabaseOrigin} wss://bhwchdzfvhhhuxovrqio.supabase.co ${gameServerOrigin} ${gameServerWsOrigin} ${socketOrigin} ${socketWsOrigin} ${livekitWss} ${livekitHttps} https://api.twilio.com https://verify.twilio.com`,
    `media-src 'self'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `frame-src 'self' ${livekitWss}`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ].join('; ')
}