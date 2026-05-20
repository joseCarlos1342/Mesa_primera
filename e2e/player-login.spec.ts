import { test, expect, type Page } from '@playwright/test'

const PLAYER_PHONE = process.env.E2E_PLAYER_PHONE ?? '3205802918'
const PLAYER_PIN = process.env.E2E_PLAYER_PIN ?? '123456'

async function injectTurnstileToken(page: Page, token = 'e2e-turnstile-token') {
  await page.locator('form').evaluate((form, value) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'cf-turnstile-response'
    input.value = String(value)
    form.appendChild(input)
  }, token)
}

async function fillPlayerLogin(page: Page) {
  await page.goto('/login/player')
  await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

  await page.getByPlaceholder('3001234567').fill(PLAYER_PHONE)
  await page.getByPlaceholder('3001234567').blur()

  const pinInput = page.locator('input[name="pin"]')
  await expect(pinInput).toBeVisible()
  await pinInput.fill(PLAYER_PIN)

  await injectTurnstileToken(page)
}

test.describe('Player Login Journey', () => {
  test('login exitoso setea cookies y navega al dashboard', async ({ page, context, baseURL }) => {
    const targetHost = new URL(baseURL ?? 'http://127.0.0.1:3000').hostname

    await context.addCookies([
      {
        name: 'device_trusted_id',
        value: process.env.E2E_TRUSTED_DEVICE_ID ?? 'trusted-device-e2e',
        domain: targetHost,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ])

    await fillPlayerLogin(page)

    await Promise.all([
      page.waitForURL(/\/dashboard|\/$/),
      page.getByRole('button', { name: /entrar a jugar/i }).click(),
    ])

    await expect(page).toHaveURL(/\/dashboard|\/$/)

    const cookies = await context.cookies()
    expect(cookies.some((cookie) => cookie.name.includes('supabase'))).toBeTruthy()
    expect(cookies.some((cookie) => cookie.name === 'session_device_id')).toBeTruthy()
    expect(cookies.some((cookie) => cookie.name === 'mesa_primera_auth_bypass')).toBeTruthy()
  })

  test('credenciales inválidas mantienen al usuario en login con mensaje accionable', async ({ page }) => {
    await page.goto('/login/player')
    await page.getByPlaceholder('3001234567').fill(PLAYER_PHONE)
    await page.getByPlaceholder('3001234567').blur()
    await page.locator('input[name="pin"]').fill('000000')
    await injectTurnstileToken(page)

    await page.getByRole('button', { name: /entrar a jugar/i }).click()

    await expect(page).toHaveURL(/\/login\/player/)
    await expect(page.getByText(/número o clave incorrectos/i)).toBeVisible()
  })

  test('HTTP 403 degrada a mensaje seguro sin romper la UI', async ({ page }) => {
    await page.route('**/login/player**', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<div role="alert">No pudimos contactar al servidor de autenticación. Inténtalo de nuevo en unos minutos.</div>',
      })
    })

    await fillPlayerLogin(page)
    await page.getByRole('button', { name: /entrar a jugar/i }).click()

    await expect(page.getByRole('alert')).toContainText('servidor de autenticación')
  })

  test('HTTP 404 durante submit muestra fallback navegable', async ({ page }) => {
    await page.route('**/login/player**', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }

      await route.fulfill({
        status: 404,
        contentType: 'text/html; charset=utf-8',
        body: '<main><h1>No encontramos el recurso solicitado</h1><a href="/login/player">Volver a iniciar sesión</a></main>',
      })
    })

    await fillPlayerLogin(page)
    await page.getByRole('button', { name: /entrar a jugar/i }).click()

    await expect(page.getByText(/no encontramos el recurso/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /volver a iniciar sesión/i })).toHaveAttribute('href', '/login/player')
  })
})
