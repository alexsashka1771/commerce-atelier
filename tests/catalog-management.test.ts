import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/lib/store";
const data = {
  name: "The new studio shirt",
  category: "Shirts",
  price: 7200,
  description: "A well considered organic everyday shirt.",
  material: "Organic cotton",
  images: ["/images/linen-shirt.svg", "/images/cotton-tee.svg"],
  variants: [
    { size: "S", color: "Blue", stock: 3 },
    { size: "M", color: "Chalk", stock: 5 },
  ],
};
test("variant edits reject repeated existing IDs", () => {
  const s = new Store(":memory:");
  const p = s.createProduct(data);
  assert.throws(
    () =>
      s.updateProduct(p.id, {
        variants: [
          { ...p.variants[0] },
          { ...p.variants[0], color: "Another color" },
        ],
      }),
    /Duplicate variant/i,
  );
  s.close();
});
test("archived product cannot be checked out and removed variant records survive cancellation", () => {
  const s = new Store(":memory:");
  const p = s.createProduct(data);
  const request = {
    key: "catalog-reservation-000001",
    payment: "cod",
    customer: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555123456",
      address: "12 Studio Road, London",
    },
    items: [{ variantId: p.variants[0].id, quantity: 1 }],
  };
  const order = s.checkout(request);
  s.updateProduct(p.id, { variants: [p.variants[1]] });
  s.transition(order.id, "cancelled");
  assert.equal(s.variant(p.variants[0].id)?.stock, 3);
  s.archiveProduct(p.id, true);
  assert.throws(
    () =>
      s.checkout({
        ...request,
        key: "catalog-reservation-000002",
        items: [{ variantId: p.variants[1].id, quantity: 1 }],
      }),
    /unavailable/i,
  );
  s.close();
});
test("admin creates products with gallery and independently stocked color/size variants", () => {
  const s = new Store(":memory:");
  const p = s.createProduct(data);
  assert.equal(p.images.length, 2);
  assert.equal(p.variants.length, 2);
  assert.equal(p.variants[1].stock, 5);
  assert.equal(p.variants[0].color, "Blue");
  s.close();
});
test("product creation rejects unknown category and nonlocal image URLs", () => {
  const s = new Store(":memory:");
  assert.throws(
    () => s.createProduct({ ...data, category: "Missing" }),
    /category/i,
  );
  assert.throws(
    () =>
      s.createProduct({ ...data, images: ["https://external.example/a.jpg"] }),
    /image/i,
  );
  s.close();
});
test("admin updates variant stock without altering other variants", () => {
  const s = new Store(":memory:");
  const p = s.createProduct(data);
  const updated = s.updateProduct(p.id, {
    variants: p.variants.map((v, i) => ({
      ...v,
      stock: i === 0 ? 9 : v.stock,
    })),
  } as never);
  assert.equal(updated.variants[0].stock, 9);
  assert.equal(updated.variants[1].stock, 5);
  s.close();
});
test("soft archived products disappear from shop and can be restored", () => {
  const s = new Store(":memory:");
  const p = s.createProduct(data);
  s.archiveProduct(p.id, true);
  assert.equal(s.product(p.id), undefined);
  s.archiveProduct(p.id, false);
  assert.equal(s.product(p.id)?.name, data.name);
  s.close();
});
test("category rename propagates to products and used categories cannot be archived", () => {
  const s = new Store(":memory:");
  const c = s.createCategory("Accessories");
  s.updateCategory(c.id, { name: "Everyday accessories" });
  const p = s.createProduct({ ...data, category: "Everyday accessories" });
  assert.equal(p.category, "Everyday accessories");
  assert.throws(() => s.updateCategory(c.id, { active: 0 }), /products/i);
  s.archiveProduct(p.id, true);
  s.updateCategory(c.id, { active: 0 });
  assert.equal(
    s.categories().some((x) => x.id === c.id),
    false,
  );
  s.close();
});
test("duplicate variant combinations and negative stock are rejected", () => {
  const s = new Store(":memory:");
  assert.throws(
    () =>
      s.createProduct({
        ...data,
        variants: [{ size: "S", color: "Blue", stock: -1 }],
      }),
    /stock/i,
  );
  assert.throws(
    () =>
      s.createProduct({
        ...data,
        variants: [data.variants[0], data.variants[0]],
      }),
    /duplicate/i,
  );
  s.close();
});
test("contact form stores valid inquiries and rejects malformed email", () => {
  const s = new Store(":memory:");
  s.contact({
    name: "Ada Lovelace",
    email: "ada@example.com",
    message: "I would like to know more about your linen.",
  });
  assert.equal(s.inquiries().length, 1);
  assert.throws(
    () =>
      s.contact({
        name: "Ada",
        email: "bad",
        message: "Can you help me with sizing?",
      }),
    /email/i,
  );
  s.close();
});
