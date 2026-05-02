const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = '/tmp/final_audit';
fs.mkdirSync(out, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name), fullPage: false });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('tutoriales').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  
  // Screenshot carousel
  await shot(page, '01_carousel.png');
  
  // Helper: open tutorial by title
  async function openTutorial(title) {
    const cards = await page.locator('h3').all();
    for (const c of cards) {
      if ((await c.innerText()).includes(title)) {
        await c.click({ force: true });
        await page.waitForTimeout(2000);
        return true;
      }
    }
    return false;
  }
  
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
    const ok = await openTutorial(tutorials[i]);
    if (!ok) { console.log('SKIP', tutorials[i]); continue; }
    const safe = tutorials[i].replace(/[^a-z0-9]/gi, '_').toLowerCase();
    await shot(page, `${String(i+2).padStart(2,'0')}_${safe}_s1.png`);
    
    // Step 2
    const next = page.getByRole('button', { name: /Siguiente/i }).first();
    if (await next.count() > 0 && !(await next.evaluate(e => e.disabled))) {
      await next.click({ force: true });
      await page.waitForTimeout(1500);
      await shot(page, `${String(i+2).padStart(2,'0')}_${safe}_s2.png`);
    }
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  
  await browser.close();
  console.log('Done');
})();
