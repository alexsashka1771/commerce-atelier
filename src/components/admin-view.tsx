"use client";
import { useState } from "react";
import type { Order, Product, Status, Category, Inquiry } from "@/lib/store";
import { money } from "@/lib/format";
import { AdminProducts, AdminCategories } from "./admin-catalog";
export function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <h1>
        The studio
        <br />
        <em>workspace.</em>
      </h1>
      <p>A quiet place to keep good things in order.</p>
      <form onSubmit={login}>
        <label>
          Email address
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button full" disabled={busy}>
          {busy ? "Opening the studio…" : "Enter the studio"}
          <span>↗</span>
        </button>
      </form>
      <p className="small-note">
        First visit? Run <code>npm run setup</code> to create your local
        administrator. No default password is included.
      </p>
    </div>
  );
}
const nextStatuses: Record<Status, Status[]> = {
  pending: ["cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
export function AdminView({
  initialProducts,
  initialOrders,
  initialCategories,
  initialInquiries,
}: {
  initialProducts: Product[];
  initialOrders: Order[];
  initialCategories: Category[];
  initialInquiries: Inquiry[];
}) {
  const [tab, setTab] = useState("orders");
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState("all");
  async function change(id: string, status: Status) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setOrders((current) => current.map((o) => (o.id === id ? d.order : o)));
      const catalog = await (await fetch("/api/admin/products")).json();
      setProducts(catalog.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy("");
    }
  }
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.reload();
  }
  return (
    <div className="admin-shell">
      <div className="section-heading">
        <div>
          <h1>
            Good things, <em>in order.</em>
          </h1>
        </div>
        <button className="text-button" onClick={logout}>
          Sign out ↗
        </button>
      </div>
      <div className="admin-metrics">
        <div>
          <small>ORDERS</small>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <small>CONFIRMED VALUE</small>
          <strong>
            {money(
              orders
                .filter((o) => !["pending", "cancelled"].includes(o.status))
                .reduce((s, o) => s + o.total, 0),
            )}
          </strong>
        </div>
        <div>
          <small>PIECES IN STOCK</small>
          <strong>
            {products.reduce(
              (s, p) => s + p.variants.reduce((n, v) => n + v.stock, 0),
              0,
            )}
          </strong>
        </div>
      </div>
      <div className="admin-tabs">
        <button
          className={tab === "orders" ? "selected" : ""}
          onClick={() => setTab("orders")}
        >
          Orders ({orders.length})
        </button>
        <button
          className={tab === "products" ? "selected" : ""}
          onClick={() => setTab("products")}
        >
          Products ({products.length})
        </button>
        <button
          className={tab === "categories" ? "selected" : ""}
          onClick={() => setTab("categories")}
        >
          Categories ({categories.filter((c) => c.active).length})
        </button>
        <button
          className={tab === "inquiries" ? "selected" : ""}
          onClick={() => setTab("inquiries")}
        >
          Studio inbox ({initialInquiries.length})
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {tab === "products" ? (
        <AdminProducts
          products={products}
          categories={categories}
          onProducts={setProducts}
        />
      ) : tab === "categories" ? (
        <AdminCategories
          categories={categories}
          onCategories={setCategories}
          onProducts={setProducts}
        />
      ) : tab === "inquiries" ? (
        <div className="studio-inbox">
          <div className="section-heading">
            <h2>A little conversation.</h2>
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Refresh inbox ↻
            </button>
          </div>
          {initialInquiries.length ? (
            initialInquiries.map((inquiry) => (
              <article className="inquiry-card" key={inquiry.id}>
                <div>
                  <h3>{inquiry.name}</h3>
                  <span>
                    {new Date(inquiry.createdAt).toLocaleString("en-US")}
                  </span>
                </div>
                <p>{inquiry.email}</p>
                <blockquote>{inquiry.message}</blockquote>
              </article>
            ))
          ) : (
            <p className="small-note">
              Notes from the Contact page will appear here.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="admin-filter">
            <label>
              Order status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {Object.keys(nextStatuses).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Refresh data ↻
            </button>
          </div>
          {orders.filter((o) => filter === "all" || o.status === filter)
            .length ? (
            orders
              .filter((o) => filter === "all" || o.status === filter)
              .map((o) => (
                <article className="admin-order" key={o.id}>
                  <div className="admin-order-head">
                    <div>
                      <strong>{o.number}</strong>
                      <span>
                        {new Date(o.createdAt).toLocaleString("en-US")}
                      </span>
                    </div>
                    <span className={`status-pill ${o.status}`}>
                      {o.status}
                    </span>
                    <strong>{money(o.total)}</strong>
                  </div>
                  <div className="admin-order-body">
                    <div>
                      <h3>{o.customer.name}</h3>
                      <p>
                        {o.customer.email}
                        <br />
                        {o.customer.phone}
                        <br />
                        {o.customer.address}
                      </p>
                      <small>
                        {o.payment === "cod"
                          ? "CASH ON DELIVERY"
                          : "STRIPE TEST"}
                      </small>
                    </div>
                    <div>
                      {o.items.map((i) => (
                        <p key={i.variantId}>
                          {i.quantity} × {i.name}
                          <small>
                            {i.size} / {i.color} · {money(i.price)}
                          </small>
                        </p>
                      ))}
                    </div>
                    <div className="order-actions">
                      {nextStatuses[o.status]
                        .filter(
                          (s) =>
                            !(
                              s === "cancelled" &&
                              o.payment === "stripe" &&
                              o.status !== "pending"
                            ),
                        )
                        .map((s) => (
                          <button
                            key={s}
                            disabled={busy === o.id}
                            className={`button compact ${s === "cancelled" ? "outline" : ""}`}
                            onClick={() => change(o.id, s)}
                          >
                            {s === "cancelled"
                              ? "Cancel & restock"
                              : `Mark ${s}`}{" "}
                            ↗
                          </button>
                        ))}
                    </div>
                  </div>
                </article>
              ))
          ) : (
            <div className="empty-state">
              <h2>A clean slate.</h2>
              <p>Orders will appear here after checkout.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
