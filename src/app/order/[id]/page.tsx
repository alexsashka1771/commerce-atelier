import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore, money } from "@/lib/store";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};
export default async function Receipt({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getStore().order(id);
  if (!order) notFound();
  return (
    <div className="page-container receipt">
      <div className="receipt-heading">
        <span className="receipt-icon">
          {order.status === "pending"
            ? "◷"
            : order.status === "cancelled"
              ? "↺"
              : "✓"}
        </span>
        <span className="order-number">{order.number}</span>
        <h1>
          {order.status === "pending"
            ? "A little moment."
            : order.status === "cancelled"
              ? "Another time, perhaps."
              : "Good things are on their way."}
        </h1>
        <p>
          {order.status === "pending"
            ? "Your payment is awaiting confirmation. Refresh this page after payment."
            : order.status === "cancelled"
              ? "This order has been cancelled and reserved stock released."
              : `Thank you, ${order.customer.name.split(" ")[0]}. Your considered choices are confirmed.`}
        </p>
        <span className={`status-pill ${order.status}`}>{order.status}</span>
      </div>
      <div className="receipt-grid">
        <div>
          <h2>Your order</h2>
          {order.items.map((i) => (
            <div className="receipt-item" key={i.variantId}>
              <img src={i.image} alt={i.name} width="72" height="90" />
              <span>
                {i.name}
                <small>
                  {i.color} / {i.size} · Qty {i.quantity}
                </small>
              </span>
              <strong>{money(i.price * i.quantity)}</strong>
            </div>
          ))}
          <div className="receipt-total">
            <span>
              Delivery {order.shipping ? money(order.shipping) : "on us"}
            </span>
            <strong>Total {money(order.total)}</strong>
          </div>
        </div>
        <aside>
          <h2>The details</h2>
          <p>
            <strong>Delivering to</strong>
            <br />
            {order.customer.name}
            <br />
            {order.customer.address}
          </p>
          <p>
            <strong>Payment</strong>
            <br />
            {order.payment === "cod"
              ? "Cash on delivery"
              : "Stripe test checkout"}
          </p>
          <p>
            <strong>A little note</strong>
            <br />
            This is a portfolio demo. No physical shipment or real charge takes
            place.
          </p>
        </aside>
      </div>
      <Link className="button" href="/collections">
        Keep exploring <span>↗</span>
      </Link>
    </div>
  );
}
