// Test Google OAuth registration flow for Mesa Primera
// Uses headed Chrome to avoid Google's bot detection

import { chromium } from 'playwright';

const SITE_URL = "https://primerariveradalos4ases.com";
const GOOGLE_EMAIL = "gomezrodriguez1344@gmail.com";
const GOOGLE_PASSWORD = "Bvf79h55118189";

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function humanType(element, text, delayMs = 50) {
  for (const char of text) {
    await element.type(char, { delay: delayMs });
    await delay(Math.random() * 30);
  }
}

const browser = await chromium.launch({
  headless: false,
  executablePath: "/home/jose/.cache/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome",
  args: ["--disable-blink-features=AutomationControlled"],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
});

const page = await context.newPage();

// Remove automation indicators
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});

try {
  console.log("1. Navigating to login page...");
  await page.goto(`${SITE_URL}/login/player`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/step01_login_page.png" });
  console.log(`   URL: ${page.url()}`);

  console.log("2. Clicking 'Ingresar con Google'...");
  await page.getByRole("button", { name: "Ingresar con Google" }).click();
  await page.waitForLoadState("networkidle");
  await delay(2000);
  await page.screenshot({ path: "/tmp/step02_google_signin.png" });
  console.log(`   URL: ${page.url()}`);

  if (page.url().includes("rejected")) {
    console.log("   ❌ Google rejected the browser.");
    await browser.close();
    process.exit(1);
  }

  console.log("3. Entering email...");
  const emailInput = page.getByRole("textbox", { name: "Email or phone" });
  await humanType(emailInput, GOOGLE_EMAIL);
  await page.screenshot({ path: "/tmp/step03_email_entered.png" });

  console.log("4. Clicking Next...");
  await page.getByRole("button", { name: "Next" }).click();
  await delay(3000);
  await page.screenshot({ path: "/tmp/step04_password_page.png" });
  console.log(`   URL: ${page.url()}`);

  if (page.url().includes("rejected")) {
    console.log("   ❌ Google rejected after email.");
    await browser.close();
    process.exit(1);
  }

  console.log("5. Entering password...");
  const passwordInput = page.getByRole("textbox", { name: "Enter your password" });
  await humanType(passwordInput, GOOGLE_PASSWORD, 30);
  await page.screenshot({ path: "/tmp/step05_password_entered.png" });

  console.log("6. Clicking Next (password)...");
  await page.getByRole("button", { name: "Next" }).click();
  await delay(5000);
  await page.screenshot({ path: "/tmp/step06_after_password.png" });
  console.log(`   URL: ${page.url()}`);

  // Handle consent screen
  if (page.url().toLowerCase().includes("consent") || page.url().toLowerCase().includes("oauthchooseaccount")) {
    console.log("7. Handling consent/account screen...");
    try { await page.getByRole("button", { name: "Continue" }).click({ timeout: 5000 }); } catch {
      try { await page.getByRole("button", { name: "Allow" }).click({ timeout: 5000 }); } catch {
        console.log("   No consent button, continuing...");
      }
    }
    await delay(3000);
  }

  await page.screenshot({ path: "/tmp/step07_redirected.png" });
  console.log(`   URL after consent: ${page.url()}`);

  // Wait for redirect back to our site
  try {
    await page.waitForURL(/primerariveradalos4ases\.com/, { timeout: 15000 });
  } catch {
    console.log("   Timeout waiting for redirect to our site");
  }
  await delay(3000);
  await page.screenshot({ path: "/tmp/step08_back_on_site.png" });
  console.log(`   Back on site: ${page.url()}`);

  // Complete registration
  if (page.url().includes("/register/player/complete")) {
    console.log("8. ✅ Arrived at profile completion page!");
    await delay(2000);
    
    console.log("9. Filling profile form...");
    
    const nicknameInput = page.locator('input[name="nickname"]');
    if (await nicknameInput.isVisible()) { await nicknameInput.fill("Yeyo"); console.log("   ✅ Nickname: Yeyo"); }
    
    const phoneInput = page.locator('input[name="phone"]');
    if (await phoneInput.isVisible()) { await phoneInput.fill("0000000006"); console.log("   ✅ Phone: 0000000006"); }
    
    const nameInput = page.locator('input[name="fullName"]');
    if (await nameInput.isVisible()) { await nameInput.fill("Jose Gomez Prueba"); console.log("   ✅ Name: Jose Gomez Prueba"); }
    
    // Select avatar
    try {
      const avatarButtons = page.locator('[data-avatar-id]');
      if (await avatarButtons.count() > 0) { await avatarButtons.first().click(); console.log("   ✅ Avatar selected"); }
    } catch {}
    
    await page.screenshot({ path: "/tmp/step09_form_filled.png" });
    
    console.log("10. Submitting form...");
    await page.locator('button[type="submit"]').click();
    await delay(8000);
    await page.screenshot({ path: "/tmp/step10_after_submit.png", fullPage: true });
    console.log(`    URL: ${page.url()}`);
    
    // Check for ALL possible error displays
    try {
      // Server error banner (no role="alert", uses bg-brand-red class)
      const errorBanner = page.locator('.text-brand-red, .bg-brand-red\\/10, [class*="red"]');
      const errorCount = await errorBanner.count();
      for (let i = 0; i < errorCount; i++) {
        const text = await errorBanner.nth(i).textContent();
        if (text?.trim()) console.log(`    ❌ Error [${i}]: ${text.trim()}`);
      }
      // Field errors (red text under inputs)
      const fieldErrors = page.locator('.text-red-400, .text-red-500');
      const fieldErrCount = await fieldErrors.count();
      for (let i = 0; i < fieldErrCount; i++) {
        const text = await fieldErrors.nth(i).textContent();
        if (text?.trim()) console.log(`    ❌ Field error [${i}]: ${text.trim()}`);
      }
      // Any role="alert" elements
      const alerts = page.locator('[role="alert"]');
      if (await alerts.count() > 0) {
        for (let i = 0; i < await alerts.count(); i++) {
          const text = await alerts.nth(i).textContent();
          if (text?.trim()) console.log(`    ⚠️ Alert [${i}]: ${text.trim()}`);
        }
      }
    } catch (e) { console.log(`    Error detection failed: ${e.message}`); }
    
    // OTP
    if (page.url().includes("/verify")) {
      console.log("11. ✅ OTP verification page!");
      await delay(1000);
      await page.locator('input[name="token"]').fill("123456");
      console.log("    ✅ OTP: 123456");
      await page.locator('button[type="submit"]').click();
      await delay(5000);
      await page.screenshot({ path: "/tmp/step12_after_otp.png" });
      console.log(`    URL: ${page.url()}`);
      
      // PIN
      if (page.url().includes("/pin")) {
        console.log("13. ✅ PIN setup page!");
        await delay(1000);
        await page.locator('input[name="pin"]').fill("123456");
        await page.locator('input[name="pinConfirm"]').fill("123456");
        console.log("    ✅ PIN: 123456");
        await page.locator('button[type="submit"]').click();
        await delay(5000);
        await page.screenshot({ path: "/tmp/step13_after_pin.png" });
        console.log(`    URL: ${page.url()}`);
        
        // Biometric
        if (page.url().includes("/biometric")) {
          console.log("14. Biometric page - skipping...");
          try {
            const skipBtn = page.locator('button:has-text("AHORA NO, GRACIAS")');
            await skipBtn.waitFor({ timeout: 5000 });
            await skipBtn.click();
            await delay(3000);
          } catch {}
          await page.screenshot({ path: "/tmp/step14_after_biometric.png" });
          console.log(`    URL: ${page.url()}`);
        }
        
        console.log("\n🎉 REGISTRATION COMPLETE!");
      }
    }
  } else if (page.url().includes("/login")) {
    console.log("   ❌ Still on login page");
    try { const a = page.locator('[role="alert"]'); if (await a.isVisible()) console.log(`   Error: ${await a.textContent()}`); } catch {}
  } else {
    console.log(`   Page: ${page.url()}`);
  }

  console.log(`\n=== FINAL: ${page.url()} ===`);
  await page.screenshot({ path: "/tmp/step_final.png" });

} catch (err) {
  console.error("Error:", err.message);
  await page.screenshot({ path: "/tmp/step_error.png" }).catch(() => {});
}

console.log("Closing in 10s...");
await delay(10000);
await browser.close();
