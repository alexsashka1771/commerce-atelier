"""One bounded desktop/mobile pass plus the established shopping and review regressions."""
import hashlib
import json
import os
import runpy
import secrets
import sqlite3
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3103"
os.environ["ATELIER_URL"] = base
if "--visual-only" not in sys.argv:
    runpy.run_path("scripts/verify-browser.py", run_name="__main__")
    runpy.run_path("scripts/verify-review-browser.py", run_name="__main__")

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
screenshots = Path("docs/screenshots")
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        context.add_cookies([{"name": "atelier-admin", "value": token, "domain": urlparse(base).hostname, "path": "/", "httpOnly": True, "sameSite": "Strict"}])
        page = context.new_page()
        errors = []
        failures = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("response", lambda response: failures.append(response.url) if response.status >= 400 else None)
        for width, height, name in [(1440, 1000, "desktop"), (390, 844, "mobile")]:
            page.set_viewport_size({"width": width, "height": height})
            for route in ["/", "/collections", "/product/linen-shirt", "/cart", "/checkout", "/about", "/contact", "/admin"]:
                page.goto(base + route)
                page.wait_for_load_state("networkidle")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (name, route)
                assert page.evaluate("[...document.images].every(image => image.complete && image.naturalWidth > 0)"), (name, route)
                checks += 1
                print("PASS " + name + " " + route + " loads images without overflow", flush=True)
                if route == "/":
                    assert page.locator(".product-card").count() == 6
                    assert page.locator(".product-card img[src$='.webp']").count() == 6
                    page.screenshot(path=str(screenshots / ("redesign-" + name + ".png")), full_page=True)
                    if name == "desktop":
                        page.screenshot(path=str(screenshots / "storefront.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 920})
                if route == "/product/linen-shirt":
                    page.get_by_role("button", name="Add to bag").click()
                if route in ["/product/linen-shirt", "/cart", "/checkout"]:
                    page.screenshot(path=str(screenshots / ("redesign-" + route.strip("/").replace("/", "-") + "-" + name + ".png")), full_page=True)
                if route == "/checkout":
                    expect(page.get_by_role("button", name="Place your order")).to_be_visible()
                if route == "/admin":
                    page.get_by_role("button", name="Products (6)", exact=True).click()
                    page.locator(".managed-product").first.locator("summary").click()
                    expect(page.get_by_role("button", name="Save product").first).to_be_visible()
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (name, "admin product form")
                    page.screenshot(path=str(screenshots / ("redesign-admin-" + name + ".png")), full_page=True)
                    checks += 1
                    print("PASS " + name + " admin product form opens without overflow", flush=True)
                if name == "mobile" and route == "/":
                    page.get_by_role("button", name="Toggle navigation").click()
                    expect(page.get_by_role("link", name="Shop all", exact=True)).to_be_visible()
                    page.get_by_role("link", name="Shop all", exact=True).click()
                    expect(page.locator(".main-nav")).not_to_have_class("main-nav open")
                    checks += 1
                    print("PASS mobile navigation opens and closes after choosing collection", flush=True)
        assert not errors, json.dumps(errors)
        assert not failures, json.dumps(failures)
        checks += 1
        print("PASS all inspected pages have no JavaScript exceptions or failed resources", flush=True)
    finally:
        browser.close()
        with sqlite3.connect(database, timeout=5) as connection:
            connection.execute("DELETE FROM sessions WHERE tokenHash=?", (token_hash,))
print(f"Redesign visual browser checks: {checks}/{checks} passed.")
