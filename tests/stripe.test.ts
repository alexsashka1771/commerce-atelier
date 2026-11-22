import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { signedEvent } from "../src/lib/stripe";
test("Stripe verifies the exact signed raw body and rejects mutation", () => {
  const oldKey = process.env.STRIPE_SECRET_KEY;
  const oldSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_" + randomBytes(16).toString("hex");
  process.env.STRIPE_WEBHOOK_SECRET = randomBytes(32).toString("hex");
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = JSON.stringify({
      id: "evt_local",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_local" } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    assert.equal(signedEvent(body, signature).id, "evt_local");
    assert.throws(() => signedEvent(body + " ", signature), /signature/i);
    assert.throws(() => signedEvent(body, ""), /signature|header/i);
  } finally {
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = oldKey;
    if (oldSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = oldSecret;
  }
});
