import Stripe from "stripe";
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_"))
    throw new Error("Stripe test checkout is not configured");
  return new Stripe(key);
}
export function signedEvent(body: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe webhook is not configured");
  return stripeClient().webhooks.constructEvent(body, signature, secret);
}
