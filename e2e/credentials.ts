type E2EAdminCredentials = {
  email: string
  password: string
}

type E2EPlayerCredentials = {
  phone: string
  pin: string
  trustedDeviceId: string
}

export function requireE2EAdminCredentials(): E2EAdminCredentials {
  const email = process.env.E2E_ADMIN_EMAIL?.trim()
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD son obligatorios para ejecutar flujos admin E2E.',
    )
  }

  return { email, password }
}

export function requireE2EPlayerCredentials(): E2EPlayerCredentials {
  const phone = process.env.E2E_PLAYER_PHONE?.trim()
  const pin = process.env.E2E_PLAYER_PIN?.trim()
  const trustedDeviceId = process.env.E2E_TRUSTED_DEVICE_ID?.trim()

  if (!phone || !pin || !trustedDeviceId) {
    throw new Error(
      'E2E_PLAYER_PHONE, E2E_PLAYER_PIN y E2E_TRUSTED_DEVICE_ID son obligatorios para E2E de jugador.',
    )
  }

  return { phone, pin, trustedDeviceId }
}
