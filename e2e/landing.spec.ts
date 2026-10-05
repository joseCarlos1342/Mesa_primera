import { expect, test } from '@playwright/test'

const widths = [320, 390, 768, 1280, 1600]

for (const width of widths) {
  test(`landing sin desborde horizontal y con CTA visible a ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.setViewportSize({ width, height: 900 })
    await page.goto('/', { waitUntil: 'networkidle' })

    await expect(page.getByRole('heading', { level: 1, name: /primera riverada/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /crear cuenta gratis/i }).first()).toBeInViewport()
    await expect(page.getByRole('figure', { name: /baraja española de 28 cartas/i })).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    expect(errors).toEqual([])
  })
}

test('el nav no duplica "Crear cuenta" mientras el CTA del hero está a la vista', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })

  const navRegister = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^crear cuenta$/i })
  await expect(navRegister).toHaveCount(0)

  await page.locator('#como-se-gana').scrollIntoViewIfNeeded()
  await expect(navRegister).toBeVisible()
})

test('el tablero enseña cada mano al hacer scroll en escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })

  const board = page.getByRole('figure', { name: /baraja española/i })
  for (const kind of ['segunda', 'chivo', 'primera', 'puntos']) {
    await page.locator(`[data-board-step="${kind}"]`).scrollIntoViewIfNeeded()
    await page.locator(`[data-board-step="${kind}"]`).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(board).toHaveAttribute('data-step', kind)
    await expect(board.locator('[data-card][data-lit="true"]')).toHaveCount(4)
  }
})

test('menú móvil y tutorial accesibles con teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'networkidle' })

  const toggle = page.getByRole('button', { name: /abrir menú/i })
  await toggle.click()
  await expect(page.getByRole('button', { name: /cerrar menú/i })).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /abrir menú/i })).toHaveAttribute('aria-expanded', 'false')

  const card = page.getByRole('button', { name: /abrir tutorial: cómo instalar la app/i })
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /cómo instalar la app/i })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(card).toBeFocused()
})

test('con movimiento reducido las cartas aparecen sin animación', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await page.goto('/', { waitUntil: 'networkidle' })

  const animation = await page
    .locator('[data-card] > span')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName)
  expect(animation).toBe('none')
  await context.close()
})
