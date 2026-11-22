"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "./cart-provider";
import { money } from "@/lib/format";
export function CheckoutView({ stripeEnabled }: { stripeEnabled: boolean }) {
  const { items, clear, ready } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState("cod");
  const key = useRef("");
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, []);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 15000 ? 0 : 800;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.current,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          customer: {
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
            address: `${data.get("address")}, ${data.get("city")}, ${data.get("postal")}, ${data.get("country")}`,
          },
          payment,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      clear();
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }
  if (!ready) return <p className="loading-note">Preparing checkout…</p>;
  if (!items.length)
    return (
      <div className="empty-state">
        <h1>Start with a favorite.</h1>
        <p>Add a piece to your bag before checking out.</p>
        <Link href="/collections" className="button">
          Explore the collection ↗
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <h1>A few final details.</h1>
        <p>We’ll take it from here.</p>
      </div>
      <div className="checkout-layout">
        <form onSubmit={submit} className="checkout-form">
          <div className="form-section">
            <h2>
              <span>01</span> Your details
            </h2>
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <div className="form-row">
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={6}
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <h2>
              <span>02</span> A place to call home
            </h2>
            <label>
              Street address
              <input
                name="address"
                autoComplete="street-address"
                required
                minLength={5}
              />
            </label>
            <div className="form-row">
              <label>
                City
                <input name="city" autoComplete="address-level2" required />
              </label>
              <label>
                Postal code
                <input name="postal" autoComplete="postal-code" required />
              </label>
            </div>
            <label>
              Country
              <select name="country" autoComplete="country-name">
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Canada</option>
                <option>Germany</option>
                <option>France</option>
              </select>
            </label>
          </div>
          <div className="form-section">
            <h2>
              <span>03</span> Your payment
            </h2>
            <label
              className={`payment-option ${payment === "cod" ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="payment"
                checked={payment === "cod"}
                onChange={() => setPayment("cod")}
              />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay when your order arrives.</small>
              </span>
              <span>◇</span>
            </label>
            {stripeEnabled && (
              <label
                className={`payment-option ${payment === "stripe" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={payment === "stripe"}
                  onChange={() => setPayment("stripe")}
                />
                <span>
                  <strong>Card with Stripe</strong>
                  <small>Secure Stripe test checkout.</small>
                </span>
                <span>↗</span>
              </label>
            )}
            <p className="small-note">
              This is a working portfolio demo. No real shipment takes place.
            </p>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy
              ? "Confirming your order…"
              : payment === "stripe"
                ? "Continue to secure payment"
                : "Place your order"}
            <span>↗</span>
          </button>
        </form>
        <aside className="order-summary">
          <h2>In your bag</h2>
          {items.map((i) => (
            <div className="checkout-item" key={i.variantId}>
              <img src={i.image} alt="" width="64" height="80" />
              <span>
                {i.name}
                <small>
                  {i.color} / {i.size} · Qty {i.quantity}
                </small>
              </span>
              <strong>{money(i.price * i.quantity)}</strong>
            </div>
          ))}
          <div>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div>
            <span>Delivery</span>
            <span>{shipping ? money(shipping) : "On us"}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(subtotal + shipping)}</strong>
          </div>
          <p className="small-note">
            Prices include demo tax. All amounts in USD.
          </p>
          <Link className="text-link" href="/cart">
            ← Edit your bag
          </Link>
        </aside>
      </div>
    </>
  );
}
