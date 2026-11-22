import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/lib/store";
import {
  stripeParameters,
  openStripeCheckout,
  type StripeGateway,
} from "../src/lib/stripe-checkout";
const request = {
  key: "stripe-concurrent-review-0001",
  payment: "stripe",
  customer: {
    name: "Stripe Review",
    email: "stripe@example.com",
    phone: "555123456",
    address: "12 Review Lane, London",
  },
  items: [{ variantId: "linen-shirt-s", quantity: 2 }],
};
test("Stripe retry parameters keep the same order-based expiry when the clock advances", () => {
  const store = new Store(":memory:");
  const order = store.checkout(request);
  const original = Date.now;
  let clock = Date.parse(order.createdAt);
  Date.now = () => clock;
  try {
    const first = stripeParameters(order, "http://localhost:3102");
    clock += 1500;
    const second = stripeParameters(order, "http://localhost:3102");
    assert.deepEqual(second, first);
    assert.equal(
      first.expires_at,
      Math.floor(Date.parse(order.createdAt) / 1000) + 3600,
    );
  } finally {
    Date.now = original;
    store.close();
  }
});
test("concurrent Stripe idempotency error does not cancel or restock the winning pending order", async () => {
  const store = new Store(":memory:");
  const order = store.checkout(request);
  let release!: (session: { id: string; url: string }) => void;
  const pending = new Promise<{ id: string; url: string }>(
    (resolve) => (release = resolve),
  );
  const calls: { parameters: unknown; key: string }[] = [];
  const gateway: StripeGateway = async (parameters, key) => {
    calls.push({ parameters, key });
    if (calls.length === 1) return pending;
    throw new Error("Idempotency key in use");
  };
  const first = openStripeCheckout(
    store,
    order,
    gateway,
    "http://localhost:3102",
  );
  try {
    await assert.rejects(
      () =>
        openStripeCheckout(
          store,
          store.order(order.id)!,
          gateway,
          "http://localhost:3102",
        ),
      /Idempotency/,
    );
    assert.equal(store.order(order.id)!.status, "pending");
    assert.equal(store.variant("linen-shirt-s")!.stock, 10);
    assert.equal(calls[0].key, calls[1].key);
    assert.deepEqual(calls[0].parameters, calls[1].parameters);
    release({
      id: "cs_test_winner",
      url: "https://checkout.stripe.com/test-winner",
    });
    const winner = await first;
    assert.equal(winner.order.status, "pending");
    assert.equal(winner.order.sessionId, "cs_test_winner");
    assert.equal(winner.url, "https://checkout.stripe.com/test-winner");
    assert.equal(store.variant("linen-shirt-s")!.stock, 10);
  } finally {
    release({
      id: "cs_test_winner",
      url: "https://checkout.stripe.com/test-winner",
    });
    await first.catch(() => undefined);
    store.close();
  }
});
test("session attachment rejects a cancelled order instead of returning a payable URL", () => {
  const store = new Store(":memory:");
  const order = store.checkout(request);
  store.transition(order.id, "cancelled");
  assert.throws(
    () =>
      store.attachSession(
        order.id,
        "cs_test_cancelled",
        "https://checkout.stripe.com/test-cancelled",
      ),
    /pending|cancelled/i,
  );
  assert.equal(store.order(order.id)!.sessionId, null);
  store.close();
});
