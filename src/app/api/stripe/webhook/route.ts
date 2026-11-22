import { signedEvent } from "@/lib/stripe";
import { getStore } from "@/lib/store";
import { failure } from "@/lib/http";
import type Stripe from "stripe";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const event = signedEvent(
      await request.text(),
      request.headers.get("stripe-signature") || "",
    );
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.expired"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        event.type === "checkout.session.completed" &&
        session.payment_status !== "paid"
      )
        return Response.json({ received: true });
      getStore().paymentEvent({
        id: event.id,
        orderId: session.metadata?.orderId || "",
        sessionId: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || "",
        paid: event.type === "checkout.session.completed",
      });
    }
    return Response.json({ received: true });
  } catch (error) {
    return failure(error);
  }
}
