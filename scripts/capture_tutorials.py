from playwright.sync_api import sync_playwright
import os

output_dir = "/tmp/tutorial_screenshots"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Scroll to tutorials section
    page.evaluate("document.getElementById('tutoriales').scrollIntoView()")
    page.wait_for_timeout(500)

    # Screenshot 1: Carousel overview desktop
    page.screenshot(path=f"{output_dir}/01_carousel_desktop.png", full_page=False)

    # Click through each tutorial and capture
    tutorials = [
        "Cómo instalar la app",
        "Cómo registrarse",
        "Cómo iniciar sesión",
        "Cómo cargar saldo",
        "Cómo retirar saldo",
        "Cómo transferir saldo",
        "Cómo jugar tu primera partida",
        "Funciones del menú de mesa",
        "Amigos",
    ]

    for i, title in enumerate(tutorials, 2):
        # Find and click the tutorial card
        cards = page.locator('[data-stagger-card]').all()
        found = False
        for card in cards:
            if title in card.inner_text():
                card.click()
                page.wait_for_timeout(1500)
                page.screenshot(path=f"{output_dir}/{i:02d}_{title.replace(' ', '_').lower()}.png", full_page=False)
                # Close modal
                close_btn = page.locator('text=Volver a tutoriales')
                if close_btn.count() > 0:
                    close_btn.click()
                    page.wait_for_timeout(500)
                found = True
                break
        if not found:
            print(f"WARNING: Could not find tutorial: {title}")

    # Mobile viewport
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.evaluate("document.getElementById('tutoriales').scrollIntoView()")
    page.wait_for_timeout(500)

    page.screenshot(path=f"{output_dir}/99_carousel_mobile.png", full_page=False)

    # Test first tutorial on mobile
    cards = page.locator('[data-stagger-card]').all()
    if len(cards) > 0:
        cards[0].click()
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{output_dir}/99_install_mobile.png", full_page=False)

    browser.close()
    print(f"Screenshots saved to {output_dir}")
