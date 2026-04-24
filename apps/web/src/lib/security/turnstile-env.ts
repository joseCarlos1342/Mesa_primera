function readBuildTimeSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ''
}

function readRuntimeSiteKey() {
  if (typeof window === 'undefined') return ''

  const value = (window as unknown as {
    __MESA_PRIMERA_RUNTIME_ENV__?: { NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string }
  }).__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  return value?.trim() ?? ''
}

export function getPublicTurnstileSiteKey() {
  return readBuildTimeSiteKey() || readRuntimeSiteKey()
}
