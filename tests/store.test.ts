import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/lib/store";

const customer = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  address: "12 Garden Street, London",
  phone: "+44 7700 900123",
};
const request = (extra: Record<string, unknown> = {}) => ({
  items: [{ variantId: "linen-shirt-s", quantity: 2, price: 1 }],
  customer,
  payment: "cod",
  key: "test-checkout-key-0001",
  ...extra,
});
const make = () => new Store(":memory:");

test("catalog variants are plain serializable objects for React Server Components", () => {
  const s = make();
  for (const p of s.products()) {
    assert.equal(Object.getPrototypeOf(p), Object.prototype);
    for (const v of p.variants)
      assert.equal(Object.getPrototypeOf(v), Object.prototype);
  }
  s.close();
});

test("catalog contains original products and size variants", () => {
  const s = make();
  assert.equal(s.products().length, 6);
  assert.equal(s.products()[0].variants.length, 4);
  s.close();
});
test("checkout calculates integer-cent prices on the server", () => {
  const s = make();
  const o = s.checkout(request());
  assert.equal(o.subtotal, 17600);
  assert.equal(o.total, 17600);
  assert.equal(o.items[0].price, 8800);
  s.close();
});
test("duplicate variants merge before stock validation", () => {
  const s = make();
  const o = s.checkout(
    request({
      items: [
        { variantId: "linen-shirt-s", quantity: 1 },
        { variantId: "linen-shirt-s", quantity: 2 },
      ],
    }),
  );
  assert.equal(o.items.length, 1);
  assert.equal(o.items[0].quantity, 3);
  s.close();
});
test("fractional quantities are rejected", () => {
  const s = make();
  assert.throws(
    () =>
      s.checkout(
        request({ items: [{ variantId: "linen-shirt-s", quantity: 1.5 }] }),
      ),
    /quantity/i,
  );
  s.close();
});
test("unknown variants cannot be ordered", () => {
  const s = make();
  assert.throws(
    () => s.checkout(request({ items: [{ variantId: "fake", quantity: 1 }] })),
    /variant/i,
  );
  s.close();
});
test("insufficient stock rolls back every reservation", () => {
  const s = make();
  const before = s.variant("linen-shirt-s")!.stock;
  assert.throws(
    () =>
      s.checkout(
        request({
          items: [
            { variantId: "linen-shirt-s", quantity: 1 },
            { variantId: "linen-shirt-m", quantity: 13 },
          ],
        }),
      ),
    /stock/i,
  );
  assert.equal(s.variant("linen-shirt-s")!.stock, before);
  assert.equal(s.orders().length, 0);
  s.close();
});
test("checkout retries return the same order without consuming stock twice", () => {
  const s = make();
  const a = s.checkout(request());
  const b = s.checkout(request());
  assert.equal(a.id, b.id);
  assert.equal(s.variant("linen-shirt-s")!.stock, 10);
  assert.equal(s.orders().length, 1);
  s.close();
});
test("reusing a key with changed items is rejected", () => {
  const s = make();
  s.checkout(request());
  assert.throws(
    () =>
      s.checkout(
        request({ items: [{ variantId: "linen-shirt-s", quantity: 1 }] }),
      ),
    /idempotency/i,
  );
  s.close();
});
test("cancelling an order restores stock exactly once", () => {
  const s = make();
  const o = s.checkout(request());
  s.transition(o.id, "cancelled");
  s.transition(o.id, "cancelled");
  assert.equal(s.variant("linen-shirt-s")!.stock, 12);
  s.close();
});
test("order workflow rejects backwards transitions", () => {
  const s = make();
  const o = s.checkout(request());
  s.transition(o.id, "processing");
  s.transition(o.id, "shipped");
  assert.throws(() => s.transition(o.id, "confirmed"), /transition/i);
  s.close();
});
test("duplicate paid events have one effect", () => {
  const s = make();
  const o = s.checkout(request({ payment: "stripe" }));
  s.attachSession(o.id, "cs_test_1");
  const e = {
    id: "evt_1",
    orderId: o.id,
    sessionId: "cs_test_1",
    amount: o.total,
    currency: "usd",
    paid: true,
  };
  assert.equal(s.paymentEvent(e), true);
  assert.equal(s.paymentEvent(e), false);
  assert.equal(s.order(o.id)!.status, "confirmed");
  s.close();
});
test("payment amount mismatch never marks an order paid", () => {
  const s = make();
  const o = s.checkout(request({ payment: "stripe" }));
  s.attachSession(o.id, "cs_test_1");
  assert.throws(
    () =>
      s.paymentEvent({
        id: "evt_bad",
        orderId: o.id,
        sessionId: "cs_test_1",
        amount: 1,
        currency: "usd",
        paid: true,
      }),
    /payment/i,
  );
  assert.equal(s.order(o.id)!.status, "pending");
  s.close();
});
test("expired Stripe session releases reserved stock", () => {
  const s = make();
  const o = s.checkout(request({ payment: "stripe" }));
  s.attachSession(o.id, "cs_expired");
  s.paymentEvent({
    id: "evt_expired",
    orderId: o.id,
    sessionId: "cs_expired",
    amount: o.total,
    currency: "usd",
    paid: false,
  });
  assert.equal(s.order(o.id)!.status, "cancelled");
  assert.equal(s.variant("linen-shirt-s")!.stock, 12);
  s.close();
});
test("customer information and checkout keys are validated", () => {
  const s = make();
  assert.throws(
    () => s.checkout(request({ customer: { ...customer, email: "bad" } })),
    /email/i,
  );
  assert.throws(() => s.checkout(request({ key: "" })), /key/i);
  s.close();
});
test("admin updates validate price and stock", () => {
  const s = make();
  assert.throws(() => s.updateProduct("linen-shirt", { price: -1 }), /price/i);
  assert.throws(() => s.updateProduct("linen-shirt", { stock: -1 }), /stock/i);
  s.updateProduct("linen-shirt", {
    price: 9000,
    variants: s
      .product("linen-shirt")!
      .variants.map((v) => ({ ...v, stock: 5 })),
  });
  assert.equal(s.products()[0].price, 9000);
  assert.equal(s.variant("linen-shirt-s")!.stock, 5);
  s.close();
});
