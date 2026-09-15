import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'small-landscape', width: 667, height: 375 },
  { name: 'reference-landscape', width: 906, height: 402 },
  { name: 'tablet-landscape', width: 1024, height: 600 },
  { name: 'desktop', width: 1280, height: 720 },
]

const scenarios = ['Pique', 'Guerra', 'Showdown', 'Cifras'] as const

for (const viewport of viewports) {
  test(`mantiene mostradores y cartas en ${viewport.name}`, async ({ page }) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []

    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', error => pageErrors.push(error.message))

    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/play/demo', { waitUntil: 'networkidle' })

    await expect(page.getByTestId('pot-displays')).toBeVisible()
    await page.waitForFunction(() => (
      Array.from(document.querySelectorAll('img[src*="/cards/"]')).length > 0
      && Array.from(document.querySelectorAll('img[src*="/cards/"]')).every(image => {
        const card = image as HTMLImageElement
        return card.complete && getComputedStyle(card).opacity === '1'
      })
    ))

    for (const scenario of scenarios) {
      await page.getByRole('button', { name: scenario, exact: true }).click()
      await expect(page.getByTestId('pot-main')).toBeVisible()

      const geometry = await page.evaluate(() => {
        const getRect = (selector: string) => {
          const element = document.querySelector(selector)
          if (!element) return null
          const rect = element.getBoundingClientRect()
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
        }

        const panel = getRect('[data-testid="pot-displays"]')
        const main = getRect('[data-testid="pot-main"]')
        const pique = getRect('[data-testid="pot-pique"]')
        const deckParts = ['[data-testid="deck-card"]', '[data-testid="bottom-card"]']
          .map(getRect)
          .filter((rect): rect is NonNullable<typeof rect> => rect !== null)
        const deck = deckParts.length > 0
          ? {
              left: Math.min(...deckParts.map(rect => rect.left)),
              right: Math.max(...deckParts.map(rect => rect.right)),
              top: Math.min(...deckParts.map(rect => rect.top)),
              bottom: Math.max(...deckParts.map(rect => rect.bottom)),
              width: Math.max(...deckParts.map(rect => rect.right)) - Math.min(...deckParts.map(rect => rect.left)),
              height: Math.max(...deckParts.map(rect => rect.bottom)) - Math.min(...deckParts.map(rect => rect.top)),
            }
          : null
        const mainElement = document.querySelector('[data-testid="pot-main"]')
        const piqueElement = document.querySelector('[data-testid="pot-pique"]')
        const contentFits = (element: Element | null) => {
          if (!element) return false
          const container = element.getBoundingClientRect()
          return Array.from(element.querySelectorAll(':scope > span')).every(child => {
            const content = child.getBoundingClientRect()
            return content.left >= container.left && content.right <= container.right
          })
        }

        return {
          panel,
          main,
          pique,
          deck,
          mainFits: contentFits(mainElement),
          piqueFits: contentFits(piqueElement),
          pageFits: document.documentElement.scrollWidth <= window.innerWidth + 1,
        }
      })

      expect(geometry.panel).not.toBeNull()
      expect(geometry.main).not.toBeNull()
      expect(geometry.pique).not.toBeNull()
      expect(geometry.deck).not.toBeNull()
      expect(geometry.main!.right).toBeLessThanOrEqual(geometry.deck!.left + 1)
      expect(geometry.pique!.left).toBeGreaterThanOrEqual(geometry.deck!.right - 1)
      expect(geometry.mainFits).toBe(true)
      expect(geometry.piqueFits).toBe(true)
      expect(geometry.pageFits).toBe(true)
    }

    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
    await page.screenshot({ path: `/tmp/mesa-table-${viewport.name}.png` })
  })
}
