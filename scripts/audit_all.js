const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outputDir = '/tmp/tutorial_audit';
fs.mkdirSync(outputDir, { recursive: true });

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(outputDir, name), fullPage: false });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('tutoriales').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  
  // Click through carousel to find all cards
  const allCards = [];
  for (let pageIdx = 0; pageIdx < 10; pageIdx++) {
    const cards = await page.locator('h3').all();
    for (const card of cards) {
      const text = await card.innerText();
      if (text && !allCards.find(c => c.text === text)) {
        allCards.push({ text, el: card });
      }
    }
    // Try next page
    const nextArrow = page.locator('button[aria-label="Siguiente"]').first();
    if (await nextArrow.count() > 0 && await nextArrow.isEnabled()) {
      await nextArrow.click({ force: true });
      await page.waitForTimeout(800);
    } else {
      break;
    }
  }
  
  console.log(`Found ${allCards.length} tutorials`);
  
  for (const { text } of allCards) {
    const safe = text.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
    
    // Find and click
    const card = page.locator('h3', { hasText: text }).first();
    if (await card.count() === 0) continue;
    await card.click({ force: true });
    await page.waitForTimeout(2000);
    await screenshot(page, `d_${safe}_s1.png`);
    
    // Steps
    for (let s = 2; s <= 6; s++) {
      const nextBtn = page.getByRole('button', { name: /Siguiente/i }).first();
      if (await nextBtn.count() === 0) break;
      const disabled = await nextBtn.evaluate(el => el.disabled).catch(() => true);
      if (disabled) break;
      await nextBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await screenshot(page, `d_${safe}_s${s}.png`);
    }
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  
  await browser.close();
  console.log('Audit complete');
})();
