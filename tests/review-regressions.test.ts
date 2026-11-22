import test from "node:test";
import assert from "node:assert/strict";
import { Store, money as serverMoney } from "../src/lib/store";
import { money } from "../src/lib/format";
import { variantEdits } from "../src/lib/inventory-edit";
const request = {
  key: "review-checkout-stock-00001",
  payment: "cod",
  customer: {
    name: "Review Shopper",
    email: "review@example.com",
    phone: "555123456",
    address: "12 Review Lane, London",
  },
  items: [{ variantId: "linen-shirt-s", quantity: 2 }],
};
test("client and server money formatting preserve charged cents", () => {
  for (const formatter of [money, serverMoney]) {
    assert.equal(formatter(8851), "$88.51");
    assert.equal(formatter(9651), "$96.51");
    assert.equal(formatter(8850), "$88.50");
    assert.equal(formatter(8800), "$88");
  }
});
test("unchanged variant stock is omitted from metadata edits", () => {
  const s = new Store(":memory:");
  const snapshot = s.product("linen-shirt")!.variants;
  const edits = variantEdits(snapshot, snapshot);
  assert.equal(Object.hasOwn(edits[0], "stock"), false);
  s.close();
});
test("description save from stale admin form cannot restore reserved stock", () => {
  const s = new Store(":memory:");
  const snapshot = s.product("linen-shirt")!;
  const order = s.checkout(request);
  s.updateProduct(snapshot.id, {
    description: "Updated description only",
    variants: variantEdits(snapshot.variants, snapshot.variants),
  });
  assert.equal(s.variant("linen-shirt-s")!.stock, 10);
  s.transition(order.id, "cancelled");
  assert.equal(s.variant("linen-shirt-s")!.stock, 12);
  s.close();
});
test("intentional stock adjustment from a stale form is rejected atomically", () => {
  const s = new Store(":memory:");
  const snapshot = s.product("linen-shirt")!;
  s.checkout(request);
  const changed = snapshot.variants.map((v) => ({
    ...v,
    stock: v.id === "linen-shirt-s" ? 15 : v.stock,
  }));
  assert.throws(
    () =>
      s.updateProduct(snapshot.id, {
        description: "Must roll back",
        variants: variantEdits(changed, snapshot.variants),
      }),
    /Inventory changed/i,
  );
  assert.equal(s.variant("linen-shirt-s")!.stock, 10);
  assert.equal(s.product(snapshot.id)!.description, snapshot.description);
  s.close();
});
test("stock version rejects stale edits even after reservation and cancellation return the same count", () => {
  const s = new Store(":memory:");
  const snapshot = s.product("linen-shirt")!;
  const order = s.checkout(request);
  s.transition(order.id, "cancelled");
  const changed = snapshot.variants.map((v) => ({
    ...v,
    stock: v.id === "linen-shirt-s" ? 15 : v.stock,
  }));
  assert.throws(
    () =>
      s.updateProduct(snapshot.id, {
        variants: variantEdits(changed, snapshot.variants),
      }),
    /Inventory changed/i,
  );
  assert.equal(s.variant("linen-shirt-s")!.stock, 12);
  s.close();
});
test("unversioned bulk and individual stock resets are rejected", () => {
  const s = new Store(":memory:");
  const snapshot = s.product("linen-shirt")!;
  assert.throws(() => s.updateProduct(snapshot.id, { stock: 20 }), /stock/i);
  assert.throws(
    () =>
      s.updateProduct(snapshot.id, {
        variants: snapshot.variants.map(({ id, size, color, stock }) => ({
          id,
          size,
          color,
          stock: stock + 1,
        })),
      }),
    /version/i,
  );
  s.close();
});
