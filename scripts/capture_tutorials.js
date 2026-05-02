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
  
  // Screenshot 1: Carousel overview desktop
  await page.screenshot({ path: path.join(outputDir, '01_carousel_desktop.png'), fullPage: false });
  
  const tutorials = [
    'Cómo instalar la app',
    'Cómo registrarse',
    'Cómo iniciar sesión',
    'Cómo cargar saldo',
    'Cómo retirar saldo',
    'Cómo transferir saldo',
    'Cómo jugar tu primera partida',
    'Funciones del menú de mesa',
    'Amigos',
  ];
  
  for (let i = 0; i < tutorials.length; i++) {
    const title = tutorials[i];
    const cards = await page.locator('[data-stagger-card]').all();
    let found = false;
    for (const card of cards) {
      const text = await card.innerText();
      if (text.includes(title)) {
        await card.click({ force: true });
        await page.waitForTimeout(1500);
        const safeName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await page.screenshot({ path: path.join(outputDir, `${String(i + 2).padStart(2, '0')}_${safeName}.png`), fullPage: false });
        
        // Close modal with Escape key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        found = true;
        break;
      }
    }
    if (!found) console.log('WARNING: Could not find tutorial:', title);
  }
  
  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('tutoriales').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: path.join(outputDir, '99_carousel_mobile.png'), fullPage: false });
  
  const cards = await page.locator('[data-stagger-card]').all();
  if (cards.length > 0) {
    await cards[0].click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outputDir, '99_install_mobile.png'), fullPage: false });
  }
  
  await browser.close();
  console.log('Screenshots saved to', outputDir);
})();
