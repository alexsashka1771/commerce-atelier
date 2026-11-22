"use client";
import Link from "next/link";
import { useCart } from "./cart-provider";
import { money } from "@/lib/format";
export function CartView() {
  const { items, quantity, ready } = useCart();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal >= 15000 ? 0 : 800;
  if (!ready) return <p className="loading-note">Opening your bag…</p>;
  if (!items.length)
    return (
      <div className="empty-state">
        <h1>
          A little room for
          <br />
          <em>something good.</em>
        </h1>
        <p>Your bag is empty. Find an everyday favorite.</p>
        <Link href="/collections" className="button">
          Explore the collection <span>↗</span>
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <h1>
          Your bag<span className="count">({items.length})</span>
        </h1>
      </div>
      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => (
            <article className="cart-item" key={item.variantId}>
              <Link href={`/product/${item.productId}`}>
                <img
                  src={item.image}
                  alt={item.name}
                  width="120"
                  height="150"
                />
              </Link>
              <div>
                <Link href={`/product/${item.productId}`}>
                  <h3>{item.name}</h3>
                </Link>
                <p>
                  {item.color} / {item.size}
                </p>
                <div className="quantity">
                  <button
                    aria-label={`Decrease ${item.name}`}
                    onClick={() => quantity(item.variantId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    aria-label={`Increase ${item.name}`}
                    onClick={() => quantity(item.variantId, item.quantity + 1)}
                    disabled={item.quantity >= Math.min(item.stock, 20)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="text-button remove"
                  onClick={() => quantity(item.variantId, 0)}
                >
                  Remove
                </button>
              </div>
              <strong>{money(item.price * item.quantity)}</strong>
            </article>
          ))}
          <Link className="text-link" href="/collections">
            ← A little more browsing
          </Link>
        </div>
        <aside className="order-summary">
          <h2>The essentials</h2>
          <div>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div>
            <span>Standard delivery</span>
            <span>{shipping ? money(shipping) : "On us"}</span>
          </div>
          {shipping > 0 && (
            <p className="shipping-note">
              You’re {money(15000 - subtotal)} away from complimentary delivery.
            </p>
          )}
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(subtotal + shipping)}</strong>
          </div>
          <Link className="button full" href="/checkout">
            Continue to checkout <span>↗</span>
          </Link>
          <p className="small-note">
            Final prices and availability are checked at checkout.
          </p>
          <span className="checkout-promise">
            Secure checkout · Cash on delivery available
          </span>
        </aside>
      </div>
    </>
  );
}
