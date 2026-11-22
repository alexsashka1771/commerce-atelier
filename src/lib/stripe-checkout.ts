import type Stripe from "stripe";
import type { Store, Order } from "./store";
export type StripeGateway = (
  parameters: Stripe.Checkout.SessionCreateParams,
  key: string,
) => Promise<{ id: string; url: string | null }>;
export function stripeParameters(
  order: Order,
  base: string,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    customer_email: order.customer.email,
    metadata: { orderId: order.id },
    line_items: [
      ...order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.price,
          product_data: { name: `${item.name} / ${item.size}` },
        },
      })),
      ...(order.shipping
        ? [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: order.shipping,
                product_data: { name: "Standard delivery" },
              },
            },
          ]
        : []),
    ],
    success_url: `${base}/order/${order.id}`,
    cancel_url: `${base}/order/${order.id}`,
    expires_at: Math.floor(Date.parse(order.createdAt) / 1000) + 60 * 60,
  };
}
export async function openStripeCheckout(
  store: Store,
  order: Order,
  gateway: StripeGateway,
  base: string,
) {
  const current = store.order(order.id)!;
  if (current.status === "cancelled")
    throw new Error("This checkout was cancelled; start a new checkout");
  if (current.status !== "pending")
    return { order: current, url: `/order/${current.id}` };
  if (current.checkoutUrl) return { order: current, url: current.checkoutUrl };
  const session = await gateway(stripeParameters(current, base), current.id);
  if (!session.url)
    throw new Error(
      "Stripe did not return a checkout URL; the order remains pending for reconciliation",
    );
  store.attachSession(current.id, session.id, session.url);
  return { order: store.order(current.id)!, url: session.url };
}
