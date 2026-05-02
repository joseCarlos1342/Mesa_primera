import { test } from '@playwright/test';

const sizes = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];

for (const size of sizes) {
  test(`screenshot tutorials ${size.name}`, async ({ page }) => {
    await page.setViewportSize(size.viewport);
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `/tmp/tutorial-${size.name}-landing.png`, fullPage: false });

    const cards = page.locator('[data-testid="tutorial-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      // If modal is open, close it first by clicking overlay
      const modal = page.locator('.fixed.inset-0.z-\[60\]').first();
      if (await modal.isVisible().catch(() => false)) {
        await modal.click();
        await page.waitForTimeout(300);
      }

      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await card.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `/tmp/tutorial-${size.name}-${i}.png`, fullPage: false });
    }
  });
}
