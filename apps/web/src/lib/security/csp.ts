type BuildContentSecurityPolicyOptions = {
  nonce: string
  isDevelopment: boolean
}

const supabaseOrigin = 'https://bhwchdzfvhhhuxovrqio.supabase.co'
const gameServerOrigin = 'https://vps24726.cubepath.net'
const gameServerWsOrigin = 'wss://vps24726.cubepath.net'
const livekitWss = 'wss://mesaprimera-59x1pueh.livekit.cloud'
const livekitHttps = 'https://mesaprimera-59x1pueh.livekit.cloud'

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
}: BuildContentSecurityPolicyOptions) {
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
    `img-src 'self' ${supabaseOrigin} https://www.transparenttextures.com data: blob:`,
    `connect-src 'self' ${supabaseOrigin} wss://bhwchdzfvhhhuxovrqio.supabase.co ${gameServerOrigin} ${gameServerWsOrigin} ${livekitWss} ${livekitHttps} https://api.twilio.com https://verify.twilio.com`,
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