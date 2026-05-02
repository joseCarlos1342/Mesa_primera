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
  
  // Click first card (Install)
  const firstCard = page.locator('[id="instalar-app"]').first();
  await firstCard.click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, 'modal_install_desktop.png'), fullPage: false });
  
  // Next steps
  for (let step = 1; step <= 4; step++) {
    const nextBtn = page.locator('button:has-text("Siguiente")').first();
    if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
      await nextBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, `modal_install_step${step + 1}_desktop.png`), fullPage: false });
    }
  }
  
  // Close and open register
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Click register card
  const cards = await page.locator('h3').all();
  for (const card of cards) {
    const text = await card.innerText();
    if (text.includes('Cómo registrarse')) {
      await card.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outputDir, 'modal_register_desktop.png'), fullPage: false });
      break;
    }
  }
  
  // Mobile test
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  const mobileCards = await page.locator('h3').all();
  for (const card of mobileCards) {
    const text = await card.innerText();
    if (text.includes('Cómo jugar')) {
      await card.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outputDir, 'modal_game_mobile.png'), fullPage: false });
      break;
    }
  }
  
  await browser.close();
  console.log('Done');
})();
