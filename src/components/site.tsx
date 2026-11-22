"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { SavedLink } from './saved-pieces';
export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <>
      <div className="announcement">
        <span>Complimentary shipping on orders $150+</span>
      </div>
      <header className="header">
        <button
          className="mobile-menu icon-button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <Link className="wordmark" href="/" aria-label="Atelier home">
          atelier<span>EVERYDAY, CONSIDERED.</span>
        </Link>
        <nav className={open ? "main-nav open" : "main-nav"}>
          <Link
            className={path === "/collections" ? "active" : ""}
            onClick={() => setOpen(false)}
            href="/collections"
          >
            Shop all
          </Link>
          <Link
            className={path === "/lookbook" ? "active" : ""}
            onClick={() => setOpen(false)}
            href="/lookbook"
          >
            Build a look
          </Link>
          <Link
            className={path === "/about" ? "active" : ""}
            onClick={() => setOpen(false)}
            href="/about"
          >
            Our story
          </Link>
        </nav>
        <SavedLink /><Link
          href="/cart"
          className="bag-link"
          aria-label={`Shopping bag with ${count} items`}
        >
          <svg
            width="19"
            height="22"
            viewBox="0 0 24 26"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8h18l1 16H2L3 8ZM8 9V6a4 4 0 0 1 8 0v3"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
          <span>Bag ({count})</span>
        </Link>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <Link href="/" className="wordmark">
            atelier
          </Link>
          <p>
            Good things take their time.
            <br />
            Clothing for the life you actually live.
          </p>
        </div>
        <div>
          <small>Explore</small>
          <Link href="/collections">The collection</Link>
          <Link href="/about">Our approach</Link>
          <Link href="/contact">Contact the studio</Link>
          <Link href="/admin">Studio workspace</Link>
        </div>
        <div>
          <small>Good to know</small>
          <p>
            Free shipping over $150
            <br />
            Cash on delivery available
            <br />
            All prices in USD
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Atelier. An independent demo store.
        </span>
        <span>No physical fulfillment takes place.</span>
      </div>
    </footer>
  );
}
