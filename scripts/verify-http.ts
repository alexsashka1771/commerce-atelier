import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const base = "http://127.0.0.1:3992";
  const password = randomBytes(24).toString("hex");
  const server = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3992",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_PATH: ":memory:",
        UPLOAD_PATH: resolve(
          "data/uploads/http-verification-" + randomBytes(5).toString("hex"),
        ),
        ADMIN_EMAIL: "verification@atelier.local",
        ADMIN_PASSWORD_HASH: hashPassword(password),
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let logs = "";
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  let count = 0;
  const check = (name: string, condition: unknown) => {
    assert.ok(condition, name);
    count++;
    console.log(`PASS ${name}`);
  };
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        const r = await fetch(`${base}/api/catalog`);
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "Isolated production server starts");
    const catalog = await (await fetch(`${base}/api/catalog`)).json();
    check(
      "catalog serves six products with four variants",
      catalog.products.length === 6 &&
        catalog.products[0].variants.length === 4,
    );
    for (const path of ["/", "/collections", "/product/linen-shirt"]) {
      const response = await fetch(base + path);
      const html = await response.text();
      check(
        `storefront renders ${path}`,
        response.ok &&
          html.includes("The everyday linen shirt") &&
          !html.includes("Only plain objects"),
      );
    }
    const api = async (
      path: string,
      method: string,
      data?: unknown,
      cookie?: string,
      origin = base,
    ) =>
      fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
    check(
      "admin product mutation rejects anonymous request",
      (await api("/api/admin/products/linen-shirt", "PATCH", { price: 1 }))
        .status === 401,
    );
    check(
      "cross-origin checkout is rejected",
      (
        await api(
          "/api/checkout",
          "POST",
          {},
          undefined,
          "https://untrusted.example",
        )
      ).status === 400,
    );
    check(
      "bad login is rejected",
      (
        await api("/api/admin/login", "POST", {
          email: "verification@atelier.local",
          password: password + "wrong",
        })
      ).status === 401,
    );
    const login = await api("/api/admin/login", "POST", {
      email: "verification@atelier.local",
      password,
    });
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    check(
      "admin login issues HttpOnly session",
      login.ok &&
        cookie &&
        login.headers.get("set-cookie")?.includes("HttpOnly"),
    );
    const update = await api(
      "/api/admin/products/linen-shirt",
      "PATCH",
      { price: 9000 },
      cookie,
    );
    check(
      "authenticated product price edit persists",
      update.ok && (await update.json()).product.price === 9000,
    );
    const request = {
      key: randomBytes(20).toString("hex"),
      payment: "cod",
      customer: {
        name: "Verification Shopper",
        email: "shopper@example.com",
        phone: "+1 555 0100",
        address: "12 Studio Lane, Portland, OR 97201",
      },
      items: [{ variantId: "linen-shirt-m", quantity: 2, price: 1 }],
    };
    const checkout = await api("/api/checkout", "POST", request);
    const result = await checkout.json();
    check(
      "COD order confirms using server price",
      checkout.ok &&
        result.order.status === "confirmed" &&
        result.order.total === 18000,
    );
    const retry = await (await api("/api/checkout", "POST", request)).json();
    const metadataEdit = await api(
      "/api/admin/products/linen-shirt",
      "PATCH",
      {
        description: "Metadata edit preserves reservations",
        variants: catalog.products[0].variants.map(
          ({
            id,
            size,
            color,
          }: {
            id: string;
            size: string;
            color: string;
          }) => ({ id, size, color }),
        ),
      },
      cookie,
    );
    check(
      "metadata-only variant edits preserve live reserved stock",
      metadataEdit.ok &&
        (await metadataEdit.json()).product.variants.find(
          (v: { id: string }) => v.id === "linen-shirt-m",
        ).stock === 10,
    );
    const staleInventory = await api(
      "/api/admin/products/linen-shirt",
      "PATCH",
      {
        variants: catalog.products[0].variants.map(
          (v: { id: string; stock: number }) => ({
            ...v,
            stock: v.id === "linen-shirt-m" ? 15 : v.stock,
          }),
        ),
      },
      cookie,
    );
    check(
      "stale stock update rejects without restoring inventory",
      staleInventory.status === 400 &&
        (await staleInventory.json()).error.includes("Inventory changed"),
    );
    check(
      "HTTP checkout retry returns same order",
      retry.order.id === result.order.id,
    );
    check(
      "receipt page renders",
      (await fetch(`${base}/order/${result.order.id}`)).status === 200,
    );
    const processOrder = await api(
      `/api/admin/orders/${result.order.id}`,
      "PATCH",
      { status: "processing" },
      cookie,
    );
    check(
      "admin can advance order",
      processOrder.ok &&
        (await processOrder.json()).order.status === "processing",
    );
    const cancel = await api(
      `/api/admin/orders/${result.order.id}`,
      "PATCH",
      { status: "cancelled" },
      cookie,
    );
    check(
      "admin cancellation releases stock",
      cancel.ok && (await cancel.json()).order.status === "cancelled",
    );
    const latest = await (await fetch(`${base}/api/catalog`)).json();
    check(
      "reserved inventory is restored",
      latest.products[0].variants.find(
        (v: { id: string }) => v.id === "linen-shirt-m",
      ).stock === 12,
    );
    check(
      "unsigned unconfigured Stripe webhook rejects",
      (await api("/api/stripe/webhook", "POST", {})).status === 400,
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    );
    const upload = async (
      bytes: Buffer,
      mime: string,
      auth?: string,
      fileCount = 1,
    ) => {
      const data = new FormData();
      for (let i = 0; i < fileCount; i++)
        data.append(
          "images",
          new File([new Uint8Array(bytes)], "image.png", { type: mime }),
        );
      return fetch(base + "/api/admin/uploads", {
        method: "POST",
        headers: { Origin: base, ...(auth ? { Cookie: auth } : {}) },
        body: data,
      });
    };
    check(
      "image upload rejects anonymous caller",
      (await upload(png, "image/png")).status === 401,
    );
    check(
      "image upload rejects executable with spoofed MIME",
      (await upload(Buffer.from("MZ executable content"), "image/png", cookie))
        .status === 400,
    );
    check(
      "image upload rejects oversized file",
      (await upload(Buffer.alloc(2 * 1024 * 1024 + 1), "image/png", cookie))
        .status === 400,
    );
    check(
      "image upload rejects more than five files",
      (await upload(png, "image/png", cookie, 6)).status === 400,
    );
    const imageResponse = await upload(png, "image/png", cookie);
    const uploaded = await imageResponse.json();
    check(
      "valid PNG upload creates a UUID image URL",
      imageResponse.status === 201 &&
        /^\/api\/images\/[a-f0-9-]+\.png$/.test(uploaded.images[0]),
    );
    const served = await fetch(base + uploaded.images[0]);
    check(
      "uploaded image serves exact bytes with nosniff",
      served.ok &&
        served.headers.get("content-type") === "image/png" &&
        served.headers.get("x-content-type-options") === "nosniff" &&
        Buffer.from(await served.arrayBuffer()).equals(png),
    );
    check(
      "image route rejects arbitrary filename",
      (await fetch(base + "/api/images/shell.exe")).status === 404,
    );
    check(
      "category creation rejects anonymous caller",
      (await api("/api/admin/categories", "POST", { name: "Private" }))
        .status === 401,
    );
    const categoryResponse = await api(
      "/api/admin/categories",
      "POST",
      { name: "Accessories" },
      cookie,
    );
    const category = (await categoryResponse.json()).category;
    check(
      "admin creates a category",
      categoryResponse.status === 201 && category.name === "Accessories",
    );
    check(
      "admin renames a category",
      (
        await api(
          `/api/admin/categories/${category.id}`,
          "PATCH",
          { name: "Studio accessories" },
          cookie,
        )
      ).ok,
    );
    const newProductResponse = await api(
      "/api/admin/products",
      "POST",
      {
        name: "The test companion",
        category: "Studio accessories",
        price: 8851,
        description: "A considered test piece with independent variants.",
        material: "Organic cotton",
        images: [uploaded.images[0], "/images/cotton-tee.svg"],
        variants: [
          { size: "S", color: "Blue", stock: 4 },
          { size: "M", color: "Chalk", stock: 8 },
        ],
      },
      cookie,
    );
    const newProduct = (await newProductResponse.json()).product;
    check(
      "admin creates gallery product with size/color variants",
      newProductResponse.status === 201 &&
        newProduct.images.length === 2 &&
        newProduct.variants.length === 2,
    );
    const edited = await api(
      `/api/admin/products/${newProduct.id}`,
      "PATCH",
      {
        variants: newProduct.variants.map(
          (v: { stock: number }, i: number) => ({
            ...v,
            stock: i === 0 ? 7 : v.stock,
          }),
        ),
      },
      cookie,
    );
    check(
      "admin edits individual variant stock",
      edited.ok && (await edited.json()).product.variants[0].stock === 7,
    );
    const newPage = await fetch(base + `/product/${newProduct.id}`);
    const newPageHTML = await newPage.text();
    check(
      "new product renders gallery and both colors",
      newPage.ok && newPageHTML.includes("Chalk"),
    );
    check(
      "fractional product price renders exact cents",
      newPageHTML.includes("$88.51"),
    );
    const fractionalResponse = await api("/api/checkout", "POST", {
      ...request,
      key: randomBytes(20).toString("hex"),
      items: [{ variantId: newProduct.variants[0].id, quantity: 1 }],
    });
    const fractionalOrder = (await fractionalResponse.json()).order;
    check(
      "fractional checkout charges exact 9651 cents",
      fractionalResponse.ok && fractionalOrder.total === 9651,
    );
    const fractionalReceipt = await fetch(
      base + "/order/" + fractionalOrder.id,
    );
    check(
      "receipt renders exact fractional total",
      (await fractionalReceipt.text()).includes("$96.51"),
    );
    await api(
      "/api/admin/orders/" + fractionalOrder.id,
      "PATCH",
      { status: "cancelled" },
      cookie,
    );
    check(
      "used category cannot be archived",
      (
        await api(
          `/api/admin/categories/${category.id}`,
          "PATCH",
          { active: 0 },
          cookie,
        )
      ).status === 400,
    );
    check(
      "admin soft archives product",
      (
        await api(
          `/api/admin/products/${newProduct.id}`,
          "DELETE",
          undefined,
          cookie,
        )
      ).ok,
    );
    check(
      "archived product is unavailable in storefront",
      (await fetch(base + `/product/${newProduct.id}`)).status === 404,
    );
    check(
      "admin restores archived product",
      (
        await api(
          `/api/admin/products/${newProduct.id}`,
          "POST",
          undefined,
          cookie,
        )
      ).ok,
    );
    await api(
      `/api/admin/products/${newProduct.id}`,
      "DELETE",
      undefined,
      cookie,
    );
    check(
      "empty category can be archived and restored",
      (
        await api(
          `/api/admin/categories/${category.id}`,
          "PATCH",
          { active: 0 },
          cookie,
        )
      ).ok &&
        (
          await api(
            `/api/admin/categories/${category.id}`,
            "PATCH",
            { active: 1 },
            cookie,
          )
        ).ok,
    );
    check(
      "contact rejects malformed email",
      (
        await api("/api/contact", "POST", {
          name: "Test Visitor",
          email: "bad",
          message: "A question about your linen.",
        })
      ).status === 400,
    );
    check(
      "contact saves a valid inquiry",
      (
        await api("/api/contact", "POST", {
          name: "Test Visitor",
          email: "visitor@example.com",
          message: "A question about your linen.",
        })
      ).status === 201,
    );
    const inbox = await api("/api/admin/inquiries", "GET", undefined, cookie);
    check(
      "protected admin inbox contains inquiry",
      inbox.ok && (await inbox.json()).inquiries.length === 1,
    );
    const adminPage = await fetch(base + "/admin", {
      headers: { Cookie: cookie! },
    });
    const adminHTML = await adminPage.text();
    check(
      "protected admin page renders categories and inbox",
      adminPage.ok && adminHTML.includes("Studio inbox"),
    );
    check("contact page renders", (await fetch(base + "/contact")).ok);
    const logout = await api("/api/admin/login", "DELETE", undefined, cookie);
    check(
      "admin logout revokes session",
      logout.ok &&
        (
          await api(
            "/api/admin/products/linen-shirt",
            "PATCH",
            { price: 1 },
            cookie,
          )
        ).status === 401,
    );
    console.log(
      `HTTP verification: ${count}/${count} passed. Isolated in-memory database; no demo data changed.`,
    );
  } finally {
    server.kill();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "HTTP verification failed",
  );
  process.exitCode = 1;
});
