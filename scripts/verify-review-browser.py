"""Review regressions in the real browser using an ephemeral local admin session."""
import hashlib
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = os.environ.get("ATELIER_URL", "http://127.0.0.1:3102")
database = os.environ.get("DATABASE_PATH", "./data/atelier.sqlite")
if Path(".env.local").exists() and "DATABASE_PATH" not in os.environ:
    for line in Path(".env.local").read_text().splitlines():
        if line.startswith("DATABASE_PATH="):
            database = line.split("=", 1)[1]
token = secrets.token_hex(32)
token_hash = hashlib.sha256(token.encode()).hexdigest()
with sqlite3.connect(database, timeout=5) as connection:
    connection.execute("INSERT INTO sessions(tokenHash,expires) VALUES(?,?)", (token_hash, int(time.time() * 1000) + 3600000))

checks = 0
orders = []
original = None
added_stock = False

def passed(name):
    global checks
    checks += 1
    print("PASS " + name, flush=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    admin = browser.new_context(viewport={"width": 1440, "height": 1000})
    admin.add_cookies([{"name": "atelier-admin", "value": token, "domain": urlparse(base).hostname, "path": "/", "httpOnly": True, "sameSite": "Strict"}])
    page = admin.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def catalog():
        return next(p for p in admin.request.get(base + "/api/catalog").json()["products"] if p["id"] == "linen-shirt")

    def request_order(variant_id):
        response = admin.request.post(base + "/api/checkout", data={"key": secrets.token_hex(20), "payment": "cod", "customer": {"name": "Review Browser Shopper", "email": "review-browser@example.com", "phone": "+1 555 0102", "address": "12 Review Road, London"}, "items": [{"variantId": variant_id, "quantity": 2}]}, headers={"Origin": base})
        assert response.ok, response.text()
        order = response.json()["order"]
        orders.append(order["id"])
        return order

    def save(form):
        with page.expect_response(lambda r: "/api/admin/products/linen-shirt" in r.url and r.request.method == "PATCH") as response:
            form.get_by_role("button", name="Save product").click()
        return response.value

    try:
        original = catalog()
        initial = next(v for v in original["variants"] if v["id"] == "linen-shirt-s")
        page.goto(base + "/admin")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name=re.compile(r"^Products")).click()
        item = page.locator(".managed-product").filter(has_text="The everyday linen shirt")
        item.locator("summary").click()
        form = item.locator("form")
        stock = form.locator(".variant-editor").first.get_by_label("Available stock")
        expect(stock).to_have_value(str(initial["stock"]))
        order = request_order(initial["id"])
        form.locator('textarea[name="description"]').fill("A metadata-only browser edit while stock is reserved.")
        response = save(form)
        assert response.ok, response.text()
        expect(stock).to_have_value(str(initial["stock"] - 2))
        assert next(v for v in catalog()["variants"] if v["id"] == initial["id"])["stock"] == initial["stock"] - 2
        passed("admin description-only save preserves concurrently reserved stock")
        assert admin.request.patch(base + "/api/admin/orders/" + order["id"], data={"status": "cancelled"}, headers={"Origin": base}).ok
        assert next(v for v in catalog()["variants"] if v["id"] == initial["id"])["stock"] == initial["stock"]
        passed("cancellation restores original stock without inflation")
        stock.fill(str(initial["stock"] + 3))
        response = save(form)
        assert response.status == 400
        expect(form.get_by_role("alert")).to_contain_text("Inventory changed")
        assert next(v for v in catalog()["variants"] if v["id"] == initial["id"])["stock"] == initial["stock"]
        passed("stale intentional stock edit is rejected in the real form")
        form.get_by_role("button", name="Reload latest stock").click()
        expect(stock).to_have_value(str(initial["stock"]))
        stock.fill(str(initial["stock"] + 1))
        response = save(form)
        assert response.ok, response.text()
        added_stock = True
        expect(stock).to_have_value(str(initial["stock"] + 1))
        passed("reload enables a versioned intentional inventory adjustment")
        latest = catalog()
        restore_variants = [{"id": v["id"], "size": v["size"], "color": v["color"], **({"stock": initial["stock"], "version": v["version"]} if v["id"] == initial["id"] else {})} for v in latest["variants"]]
        assert admin.request.patch(base + "/api/admin/products/linen-shirt", data={"variants": restore_variants}, headers={"Origin": base}).ok
        added_stock = False
        form.get_by_label("Price (USD)", exact=True).fill("88.51")
        response = save(form)
        assert response.ok, response.text()
        shopper = browser.new_context(viewport={"width": 1280, "height": 900})
        shop = shopper.new_page()
        shop.on("pageerror", lambda error: errors.append(str(error)))
        shop.goto(base + "/product/linen-shirt")
        shop.wait_for_load_state("networkidle")
        expect(shop.locator(".detail-price")).to_have_text("$88.51")
        passed("product renders exact fractional price")
        shop.get_by_role("button", name="L", exact=True).click()
        shop.get_by_role("button", name="Add to bag").click()
        expect(shop.locator(".bag-link")).to_contain_text("Bag (1)")
        shop.goto(base + "/cart")
        shop.wait_for_load_state("networkidle")
        expect(shop.locator(".summary-total")).to_contain_text("$96.51")
        passed("persistent cart renders exact fractional total")
        shop.get_by_role("link", name="Continue to checkout").click()
        shop.wait_for_load_state("networkidle")
        expect(shop.locator(".summary-total")).to_contain_text("$96.51")
        passed("checkout renders exact fractional total")
        for label, value in {"Full name": "Cent Browser Shopper", "Email address": "cents@example.com", "Phone number": "+1 555 0103", "Street address": "12 Cent Street", "City": "Portland", "Postal code": "97201"}.items():
            shop.get_by_label(label, exact=True).fill(value)
        shop.get_by_role("button", name="Place your order").click()
        shop.wait_for_url("**/order/*")
        orders.append(shop.url.rsplit("/", 1)[1])
        shop.wait_for_load_state("networkidle")
        expect(shop.locator(".receipt-total")).to_contain_text("$96.51")
        expect(shop.locator(".status-pill")).to_have_text("confirmed")
        passed("confirmed receipt shows the exact charged cents")
        assert not errors, errors
        passed("review browser regressions produce no JavaScript exceptions")
        shopper.close()
    finally:
        for order_id in orders:
            admin.request.patch(base + "/api/admin/orders/" + order_id, data={"status": "cancelled"}, headers={"Origin": base})
        if original:
            if added_stock:
                latest = catalog()
                variants = [{"id": v["id"], "size": v["size"], "color": v["color"], **({"stock": v["stock"] - 1, "version": v["version"]} if v["id"] == "linen-shirt-s" else {})} for v in latest["variants"]]
                admin.request.patch(base + "/api/admin/products/linen-shirt", data={"variants": variants}, headers={"Origin": base})
            admin.request.patch(base + "/api/admin/products/linen-shirt", data={"price": original["price"], "description": original["description"]}, headers={"Origin": base})
        admin.close()
        browser.close()
        with sqlite3.connect(database, timeout=5) as connection:
            connection.execute("DELETE FROM sessions WHERE tokenHash=?", (token_hash,))

print(f"Review browser verification: {checks}/{checks} passed. Fixture orders cancelled, prices and owned stock adjustment restored.", flush=True)
