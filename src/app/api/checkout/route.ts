import { getStore } from "@/lib/store";
import { stripeClient } from "@/lib/stripe";
import { openStripeCheckout } from "@/lib/stripe-checkout";
import { failure, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let providerStarted = false;
  try {
    sameOrigin(request);
    const data = await request.json();
    const stripe = data.payment === "stripe" ? stripeClient() : undefined;
    const store = getStore();
    const order = store.checkout(data);
    if (order.status === "cancelled")
      throw new Error("This checkout was cancelled; start a new checkout");
    if (stripe && order.status === "pending") {
      const base = process.env.APP_URL || new URL(request.url).origin;
      providerStarted = !order.checkoutUrl;
      const result = await openStripeCheckout(
        store,
        order,
        (parameters, key) =>
          stripe.checkout.sessions.create(parameters, { idempotencyKey: key }),
        base,
      );
      return Response.json(result);
    }
    return Response.json({ order, url: "/order/" + order.id });
  } catch (error) {
    // Provider failures can be ambiguous or concurrent. Keep the reservation
    // until a verified expiry event or an operator reconciles the payment.
    return failure(error, providerStarted ? 502 : 400);
  }
}
