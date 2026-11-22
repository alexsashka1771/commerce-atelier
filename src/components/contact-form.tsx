"use client";
import { useState } from "react";
export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          message: f.get("message"),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSent(true);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="contact-form">
      <div className="form-row">
        <label>
          Your name
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
          />
        </label>
      </div>
      <label>
        A little about what you need
        <textarea
          name="message"
          rows={6}
          required
          minLength={10}
          maxLength={2000}
          placeholder="Sizing, materials, or just a hello…"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {sent && (
        <p className="contact-success" role="status">
          Your note is safely in the studio inbox. Thank you for reaching out.
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Sending your note…" : "Send a little note"}
        <span>↗</span>
      </button>
      <p className="small-note">
        Demo contact form: your message is stored locally for the studio
        administrator. No email is sent.
      </p>
    </form>
  );
}
