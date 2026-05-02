const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outputDir = '/tmp/tutorial_screenshots';
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => document.getElementById('tutoriales').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  
  // Click first card
  const firstCard = page.locator('[id="instalar-app"]').first();
  await firstCard.click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, 'modal_install_open.png'), fullPage: false });
  
  // Click through steps
  for (let step = 1; step <= 4; step++) {
    const nextBtn = page.locator('button:has-text("Siguiente")').first();
    if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
      await nextBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, `modal_install_step${step + 1}.png`), fullPage: false });
    }
  }
  
  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Click on a different tutorial - Register
  const cards = await page.locator('h3:has-text("Cómo registrarse")').all();
  if (cards.length > 0) {
    await cards[0].click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, 'modal_register_open.png'), fullPage: false });
  }
  
  await browser.close();
  console.log('Done');
})();
