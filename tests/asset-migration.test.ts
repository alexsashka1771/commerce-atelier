import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/lib/store";

test("fresh catalog uses the six photographic product covers", () => {
  const store = new Store(":memory:");
  for (const product of store.products()) {
    assert.equal(product.image, `/images/photo-${product.id}.webp`);
    assert.deepEqual(product.images, [product.image]);
  }
  store.close();
});

test("reopening migrates only original seed galleries and preserves catalog and order data", () => {
  const directory = mkdtempSync(join(tmpdir(), "atelier-assets-"));
  const path = join(directory, "catalog.sqlite");
  let store = new Store(path);
  try {
    // Reproduce an existing catalog from before photography was introduced.
    for (const product of store.products()) {
      const image = `/images/${product.id}.svg`;
      store.db.prepare("UPDATE products SET image=?,images=? WHERE id=?").run(image, JSON.stringify([image]), product.id);
    }
    store.updateProduct("linen-shirt", { name: "My edited linen shirt", price: 8851, material: "Custom linen", description: "My own description" });
    store.db.prepare("UPDATE variants SET stock=19,version=7 WHERE id=?").run("linen-shirt-l");
    const customGallery = ["/images/knit-vest.svg", "/api/images/12345678-1234-1234-1234-123456789abc.webp"];
    store.db.prepare("UPDATE products SET images=? WHERE id=?").run(JSON.stringify(customGallery), "knit-vest");
    store.db.prepare("UPDATE products SET image=?,images=? WHERE id=?").run("/images/cotton-tee.svg", JSON.stringify(["/images/cotton-tee.svg"]), "studio-trouser");
    store.archiveProduct("weekend-jacket", true);
    const order = store.checkout({ key: "asset-migration-order-001", payment: "cod", customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "555123456", address: "12 Studio Road, London" }, items: [{ variantId: "linen-shirt-l", quantity: 1 }] });
    const before = store.product("linen-shirt")!;
    store.close();
    store = new Store(path);
    const after = store.product("linen-shirt")!;
    assert.equal(after.image, "/images/photo-linen-shirt.webp");
    assert.deepEqual(after.images, [after.image]);
    assert.deepEqual({ ...after, image: before.image, images: before.images }, before);
    assert.deepEqual(store.product("knit-vest")!.images, customGallery);
    assert.equal(store.product("knit-vest")!.image, "/images/knit-vest.svg");
    assert.equal(store.product("studio-trouser")!.image, "/images/cotton-tee.svg");
    assert.equal(store.products(true).find((product) => product.id === "weekend-jacket")!.active, 0);
    assert.deepEqual(store.order(order.id), order);
    const migrated = store.products(true);
    store.close();
    store = new Store(path);
    assert.deepEqual(store.products(true), migrated);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
