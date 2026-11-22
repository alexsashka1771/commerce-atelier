import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { Header, Footer } from "@/components/site";
import "./globals.css";
import "./editorial.css";
import "./ui-clarity.css";
import "./desktop-character.css";
export const metadata: Metadata = {
  title: {
    default: "Atelier — Everyday, considered.",
    template: "%s · Atelier",
  },
  description:
    "Thoughtfully made clothing for the life you actually live. Natural materials, considered shapes, small batches.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
