"""Isolated browser acceptance: npm run build; python -m pip install playwright;
python -m playwright install chromium; python scripts/verify-publication-browser.py.
Uses an in-memory database and ephemeral credentials; does not change demo data.
"""
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import time
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright


def main():
    root = Path(__file__).resolve().parents[1]
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    password = secrets.token_urlsafe(32)
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex()
    environment = dict(os.environ, DATABASE_PATH=":memory:", APP_URL=base,
                       ADMIN_EMAIL="browser-audit@atelier.local", ADMIN_PASSWORD_HASH=f"{salt}:{digest}",
                       STRIPE_SECRET_KEY="", STRIPE_WEBHOOK_SECRET="")
    server = subprocess.Popen([shutil.which("node"), str(root / "node_modules/next/dist/bin/next"),
                               "start", "--hostname", "127.0.0.1", "--port", str(port)],
                              cwd=root, env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                              creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    checks = 0

    def passed(label):
        nonlocal checks
        checks += 1
        print("PASS " + label)

    try:
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError("Isolated server exited before becoming ready")
            try:
                with urlopen(base + "/api/catalog", timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Isolated server did not become ready")

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))

            def visit(path):
                page.goto(base + path)
                page.wait_for_load_state("networkidle")

            visit("/")
            catalog = context.request.get(base + "/api/catalog").json()["products"]
            expect(page.locator(".collection-index a")).to_have_count(len({product["category"] for product in catalog}))
            expect(page.locator(".collection-section .product-card")).to_have_count(6)
            passed("home exposes products and category navigation")

            visit("/collections")
            page.get_by_label("Search collection").fill("linen shirt")
            expect(page.locator(".product-card")).to_have_count(1)
            page.get_by_label("Search collection").fill("")
            page.get_by_role("button", name="Shirts", exact=True).click()
            expect(page.locator(".product-card")).to_have_count(sum(product["category"] == "Shirts" for product in catalog))
            page.get_by_role("button", name="All pieces", exact=True).click()
            page.get_by_label("Sort products").select_option("low")
            expect(page.locator(".product-card")).to_have_count(len(catalog))
            expect(page.locator(".product-heading h3").first).to_have_text(min(catalog, key=lambda product: product["price"])["name"])
            prices = page.locator(".product-heading > span").all_text_contents()
            amounts = [float(price.replace("$", "").replace(",", "")) for price in prices]
            assert amounts == sorted(amounts)
            passed("catalog search category filters and price sorting work after hydration")

            login = context.request.post(base + "/api/admin/login", headers={"Origin": base},
                                         data={"email": "browser-audit@atelier.local", "password": password})
            assert login.ok
            created = context.request.post(base + "/api/admin/products", headers={"Origin": base}, data={
                "name": "The browser audit shirt", "category": "Shirts", "price": 8851,
                "description": "An isolated product for browser acceptance verification.", "material": "Cotton",
                "images": ["/images/linen-shirt.svg", "/images/cotton-tee.svg"],
                "variants": [{"size": "S", "color": "Blue", "stock": 3},
                             {"size": "M", "color": "Chalk", "stock": 5}]})
            assert created.ok
            product = created.json()["product"]
            visit("/product/" + product["id"])
            page.get_by_role("button", name="View alternate image", exact=True).click()
            expect(page.locator(".detail-image > img")).to_have_attribute("src", "/images/cotton-tee.svg")
            page.get_by_role("button", name="Blue", exact=True).click()
            expect(page.get_by_role("button", name="S", exact=True)).to_have_attribute("aria-pressed", "true")
            page.get_by_role("button", name="Add to bag").click()
            expect(page.locator(".bag-link")).to_contain_text("Bag (1)")
            passed("gallery and color selection preserve the exact size variant in the bag")

            visit("/cart")
            expect(page.locator(".cart-item")).to_contain_text("Blue / S")
            page.get_by_role("button", name="Increase The browser audit shirt", exact=True).click()
            expect(page.locator(".quantity > span")).to_have_text("2")
            expect(page.locator(".summary-total")).to_contain_text("$177.02")
            page.reload()
            page.wait_for_load_state("networkidle")
            expect(page.locator(".quantity > span")).to_have_text("2")
            page.get_by_role("button", name="Decrease The browser audit shirt", exact=True).click()
            expect(page.locator(".summary-total")).to_contain_text("$96.51")
            page.get_by_role("button", name="Remove", exact=True).click()
            expect(page.locator(".cart-item")).to_have_count(0)
            passed("cart quantity totals persistence and removal work with fractional prices")

            visit("/product/linen-shirt")
            page.get_by_role("button", name="L", exact=True).click()
            page.get_by_role("button", name="Add to bag").click()
            visit("/checkout")
            for label, value in {"Full name": "Browser Audit Shopper", "Email address": "browser@example.com",
                                 "Phone number": "+1 555 0101", "Street address": "12 Studio Street",
                                 "City": "Portland", "Postal code": "97201"}.items():
                page.get_by_label(label, exact=True).fill(value)
            page.get_by_role("button", name="Place your order").click()
            page.wait_for_url("**/order/*")
            expect(page.locator(".status-pill")).to_have_text("confirmed")
            expect(page.locator(".receipt-item")).to_contain_text("Oat / L")
            expect(page.locator(".bag-link")).to_contain_text("Bag (0)")
            passed("COD checkout confirms selected variant and clears the persistent bag")

            visit("/product/linen-shirt")
            page.get_by_role("button", name="Add to bag").click()
            expect(page.locator(".bag-link")).to_contain_text("Bag (1)")
            for width in [390, 768, 1440]:
                page.set_viewport_size({"width": width, "height": 1000})
                for path in ["/", "/collections", "/product/linen-shirt", "/cart", "/checkout", "/about", "/contact", "/admin"]:
                    visit(path)
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), (width, path)
                passed(f"eight public/admin routes including populated cart/checkout have no overflow at {width}px")
            assert not errors, errors
            passed("no browser runtime exceptions")
            context.close()
            browser.close()
        print(f"Publication browser verification: {checks}/{checks} passed; isolated in-memory data.")
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=10)


if __name__ == "__main__":
    main()
