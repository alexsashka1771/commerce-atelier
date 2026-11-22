# Requirements audit

Audited on 2026-11-22 with Node 24.18.0, npm 11.16.0 and Next.js 16.4.6 on Windows. Checkout, admin and browser scenarios used isolated in-memory databases and ephemeral credentials. Stripe's external network was not tested.

**Status legend:** Implemented = working code with the stated verification; Sandbox = synthetic/local demonstration; Optional integration = code requiring external configuration; Missing = absent capability.

| Original requirement | Status | Evidence and boundary |
| --- | --- | --- |
| Home, featured/popular products and categories | Implemented | Home renders six product cards and five category paths; category navigation and hydration tested. Studio-selected products are displayed; there is no sales-popularity analytics claim. |
| Product catalog | Implemented | Search, category filters and price sorting; browser acceptance and production HTTP rendering. |
| Dedicated product pages with galleries | Implemented | Product routes, multi-image fixture created through protected admin API, gallery switching in browser. |
| Size and color selection | Implemented | Independent size/color/stock variants; browser selection is preserved in the bag and checkout. |
| Cart quantity, removal and total | Implemented | Persistent browser bag; increase/decrease/remove tested; integer cents preserve `$177.02` and `$96.51` totals for a fractional-price fixture. |
| Checkout name, phone and address | Implemented | Form and server validation; browser COD flow; malformed customer/quantity tests; server ignores client-supplied prices. Email is also required. |
| Cash on delivery | Implemented | Real local transactional order insertion, stock reservation, confirmation and cancellation; no external service needed. |
| Stripe checkout and webhook | Optional integration | Test-key-only adapter; signed raw-body, amount/session/currency, duplicate event and concurrent retry regressions tested locally. Requires Stripe test credentials and webhook forwarding; no provider-network success claimed. |
| About and Contact | Implemented | Rendered pages and responsive form; validated inquiry persistence and protected admin inbox verified over HTTP. External email is not sent. |
| Authenticated admin product/category CRUD, multiple photos, variants, stock, order status | Implemented | Auth/Origin rejection, create/edit, upload validation, stock version conflicts, gallery/variant edits, category rename, archive/restore, order status/cancellation and logout tested. Delete uses reversible archive; paid Stripe refunds are a separate absent workflow. |
| Responsive layout | Implemented | Actual Chromium browser acceptance at 390, 768 and 1440 pixels; public pages and authenticated admin checked for horizontal overflow. Desktop design unchanged. |
| Sample catalog, product photography and physical delivery | Sandbox | Seeded products and synthetic demo imagery; local COD transactions do not dispatch real goods. |

## Fresh verification

Full terminal evidence is in [publication-test-output.txt](publication-test-output.txt), including transient environment errors and test-harness corrections.

| Command/scenario | Observed output |
| --- | --- |
| `npm ci` | `added 31 packages, and audited 32 packages`; `found 0 vulnerabilities`; exit 0. |
| `npm test` | `tests 51`; `pass 51`; `fail 0`; no skipped/cancelled tests; exit 0. |
| `npm run typecheck` | `tsc --noEmit`; exit 0. |
| `npm run build` | `Compiled successfully`; all routes generated; exit 0. |
| `npm run test:http` | `HTTP verification: 45/45 passed. Isolated in-memory database; no demo data changed.`; exit 0. |
| Clean source snapshot excluding dependencies, `.next`, data and environment files | `npm ci`, `npm run setup`, `npm run build` and `npm run test:http` all exit 0; isolated HTTP **45/45**. Setup created a relative ignored `.env.local` without printing supplied ephemeral credentials. |
| `python -X utf8 scripts/verify-publication-browser.py` | **9/9** browser acceptance groups passed; gallery/color/size, exact-cent cart quantity/persistence/removal, COD and responsive routes; no browser runtime exceptions. See final run in terminal evidence. |

The browser script finds the repository relative to its own filename, chooses an available local port, starts/stops its own production Node server, and uses an in-memory database. It requires `python -m pip install playwright` and `python -m playwright install chromium`; run after `npm run build`. It does not modify product screenshots, production/demo catalog data or source styles.

## Findings and limits

No material application defect was found in the audited store scenarios. Two initial browser-harness expectations assumed four categories and one Shirts product; the current seed has five categories and two Shirts products. Expectations were corrected to use actual catalog membership, then the browser acceptance passed.

The initial workspace `npm ci` returned Windows `EPERM` because the running preview held Next's native SWC module open. Stopping only that verified project preview allowed reinstall; the separate clean source snapshot also installed successfully. This was a runtime file lock, not a source defect. npm 11 reported an esbuild install-script approval advisory; the fresh test/build commands still succeeded. The clean build under the user temporary directory warned about an unrelated parent lockfile; it completed successfully.

CI installs Node 24 and the lockfile, runs tests, builds and checks isolated HTTP behavior. Equivalent commands were executed locally; this audit did not execute GitHub Actions or its Linux runner. Core setup and CI commands use repository-relative paths and require no prepared `C:/Work` installation. Historical screenshot/design scripts use their documented local preview ports and may target earlier layouts; the new publication browser script is the independent current acceptance check.

Production shipping, tax calculation, payment reconciliation, refunds, transactional email, account ownership, shared rate limits, backups and object-storage upload lifecycle are absent. SQLite is single-host local persistence. Signed Stripe fixtures and stub gateways establish adapter behavior, not provider connectivity. Uploaded files are header/size checked; comprehensive image decoding and production storage hardening remain outside this portfolio implementation.
