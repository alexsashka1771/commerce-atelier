"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { mergeCartBatch } from "@/lib/wardrobe";
export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
};
type CartContext = {
  items: CartItem[];
  ready: boolean;
  add: (item: CartItem) => void;
  addMany: (items: CartItem[]) => void;
  quantity: (id: string, value: number) => void;
  clear: () => void;
  count: number;
};
const Cart = createContext<CartContext | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("atelier-bag-v1") || "[]");
      if (Array.isArray(saved))
        setItems(
          saved.filter(
            (i) =>
              typeof i?.variantId === "string" &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 20,
          ),
        );
    } catch {
      localStorage.removeItem("atelier-bag-v1");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("atelier-bag-v1", JSON.stringify(items));
  }, [items, ready]);
  const add = (item: CartItem) =>
    setItems((current) => {
      const found = current.find((i) => i.variantId === item.variantId);
      return found
        ? current.map((i) =>
            i.variantId === item.variantId
              ? {
                  ...item,
                  quantity: Math.min(
                    20,
                    item.stock,
                    i.quantity + item.quantity,
                  ),
                }
              : i,
          )
        : [...current, item];
    });
  const quantity = (id: string, value: number) =>
    setItems((current) =>
      value <= 0
        ? current.filter((i) => i.variantId !== id)
        : current.map((i) =>
            i.variantId === id
              ? { ...i, quantity: Math.min(20, i.stock, value) }
              : i,
          ),
    );
  return (
    <Cart.Provider
      value={{
        items,
        ready,
        add,
        addMany: (batch) => { const next = mergeCartBatch(items, batch); setItems(next); },
        quantity,
        clear: () => setItems([]),
        count: items.reduce((sum, i) => sum + i.quantity, 0),
      }}
    >
      {children}
    </Cart.Provider>
  );
}
export function useCart() {
  const value = useContext(Cart);
  if (!value) throw new Error("Cart provider missing");
  return value;
}
