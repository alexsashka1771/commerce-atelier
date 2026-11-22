"""Browser regression against the running local demo. Creates one local COD order."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get("ATELIER_URL", "http://127.0.0.1:3102")
screenshots = Path("docs/screenshots")
screenshots.mkdir(parents=True, exist_ok=True)
checks = 0

def passed(label):
    global checks
    checks += 1
    print("PASS " + label)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    static_context = browser.new_context(java_script_enabled=False)
    static_page = static_context.new_page()
    static_page.goto(base + "/product/linen-shirt")
    expect(static_page.get_by_role("button", name="Add to bag")).to_be_disabled()
    expect(static_page.get_by_role("button", name="L", exact=True)).to_be_disabled()
    passed("purchase controls wait for browser handlers and persisted bag readiness")
    static_context.close()
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    errors = []
    failures = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: failures.append(response.url) if response.status >= 500 else None)
    page.goto(base + "/")
    page.wait_for_load_state("networkidle")
    assert page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(246, 243, 237)"
    assert page.locator(".header").bounding_box()["height"] == 94
    page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
    passed("desktop CSS loads and final screenshot is styled")
    page.goto(base + "/product/linen-shirt")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("heading", name="The everyday linen shirt", exact=True)).to_be_visible()
    passed("product page renders and hydrates")
    page.get_by_role("button", name="L", exact=True).click()
    expect(page.get_by_role("button", name="L", exact=True)).to_have_attribute("aria-pressed", "true")
    passed("size selection changes from M to L")
    page.get_by_role("button", name="Add to bag").click()
    expect(page.locator(".bag-link")).to_contain_text("Bag (1)")
    bag = page.evaluate("JSON.parse(localStorage.getItem('atelier-bag-v1'))")
    assert bag[0]["size"] == "L"
    passed("add to bag persists selected L variant")
    page.reload()
    page.wait_for_load_state("networkidle")
    expect(page.locator(".bag-link")).to_contain_text("Bag (1)")
    passed("cart survives page reload")
    page.goto(base + "/cart")
    page.wait_for_load_state("networkidle")
    expect(page.locator(".cart-item")).to_contain_text("Oat / L")
    passed("cart renders the chosen size")
    page.get_by_role("link", name="Continue to checkout").click()
    page.wait_for_load_state("networkidle")
    for label, value in {
        "Full name": "Browser Verification Shopper",
        "Email address": "browser@example.com",
        "Phone number": "+1 555 0101",
        "Street address": "12 Studio Street",
        "City": "Portland",
        "Postal code": "97201",
    }.items():
        page.get_by_label(label, exact=True).fill(value)
    page.get_by_role("button", name="Place your order").click()
    page.wait_for_url("**/order/*")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("heading", name="Good things are on their way.")).to_be_visible()
    expect(page.locator(".status-pill")).to_have_text("confirmed")
    passed("COD checkout reaches a confirmed receipt")
    expect(page.locator(".bag-link")).to_contain_text("Bag (0)")
    assert page.evaluate("JSON.parse(localStorage.getItem('atelier-bag-v1')).length") == 0
    passed("successful checkout clears persistent bag")
    page.screenshot(path=str(screenshots / "checkout-confirmed.png"), full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(base + "/")
    page.wait_for_load_state("networkidle")
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.screenshot(path=str(screenshots / "mobile-home.png"), full_page=True)
    passed("mobile home has no horizontal overflow")
    page.goto(base + "/contact")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("button", name="Send a little note")).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    passed("mobile contact form renders without overflow")
    assert not errors, json.dumps(errors)
    assert not failures, json.dumps(failures)
    passed("no browser exceptions or failed server resources")
    context.close()
    browser.close()

print(f"Browser verification: {checks}/{checks} passed. One local COD demo order created.")
