const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = '/tmp/quick_check';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('tutoriales').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  
  // Open install tutorial
  await page.locator('[id="instalar-app"]').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(out, 'install_s1.png'), fullPage: false });
  
  // Next x4
  for (let s = 2; s <= 5; s++) {
    const next = page.locator('button', { hasText: 'Siguiente' }).first();
    if (await next.count() === 0 || await next.evaluate(e => e.disabled)) break;
    await next.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `install_s${s}.png`), fullPage: false });
  }
  
  // Close by clicking overlay background
  await page.mouse.click(100, 100);
  await page.waitForTimeout(800);
  
  // Open jugar tutorial
  await page.locator('h3:has-text("Cómo jugar")').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(out, 'jugar_s1.png'), fullPage: false });
  
  for (let s = 2; s <= 5; s++) {
    const next = page.locator('button', { hasText: 'Siguiente' }).first();
    if (await next.count() === 0 || await next.evaluate(e => e.disabled)) break;
    await next.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `jugar_s${s}.png`), fullPage: false });
  }
  
  await browser.close();
  console.log('Done');
})();
