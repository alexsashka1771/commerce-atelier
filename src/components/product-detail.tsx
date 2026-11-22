"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/store";
import { money } from "@/lib/format";
import { useCart } from "./cart-provider";
export function ProductDetail({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants.find((v) => v.size === "M")?.id || product.variants[0].id,
  );
  const [image, setImage] = useState(product.images[0]);
  const [added, setAdded] = useState(false);
  const [guide, setGuide] = useState(false);
  const { add, ready } = useCart();
  const variant =
    product.variants.find((v) => v.id === selectedVariant) ||
    product.variants[0];
  const size = variant.size;
  return (
    <div className="product-detail">
      <div className="detail-image">
        <img src={image} alt={product.name} width="600" height="760" />
        {product.images.length > 1 && (
          <div className="gallery-thumbnails">
            {product.images.map((src) => (
              <button
                key={src}
                aria-label={`View ${src === product.images[0] ? "cover" : "alternate"} image`}
                aria-pressed={src === image}
                disabled={!ready}
                className={src === image ? "selected" : ""}
                onClick={() => setImage(src)}
              >
                <img src={src} alt="" width="50" height="64" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="detail-copy">
        <div className="breadcrumbs">
          <Link href="/collections">The collection</Link>
          <span>/</span>
          {product.category}
        </div>
        <h1>{product.name}</h1>
        <p className="detail-price">{money(product.price)}</p>
        <p className="detail-description">{product.description}</p>
        <div className="detail-color">
          <span>Color — {variant.color}</span>
          <i className={`swatch ${variant.color.toLowerCase()}`} />
        </div>
        {new Set(product.variants.map((v) => v.color)).size > 1 && (
          <div className="color-options" role="group" aria-label="Select color">
            {[...new Set(product.variants.map((v) => v.color))].map((color) => (
              <button
                key={color}
                className={variant.color === color ? "selected" : ""}
                aria-pressed={variant.color === color}
                disabled={!ready}
                onClick={() => {
                  const next =
                    product.variants.find(
                      (v) => v.color === color && v.size === size,
                    ) || product.variants.find((v) => v.color === color)!;
                  setSelectedVariant(next.id);
                  setAdded(false);
                }}
              >
                {color}
              </button>
            ))}
          </div>
        )}
        <div className="size-label">
          <span>Select your size — {size}</span>
          <button
            className="text-button"
            onClick={() => setGuide(!guide)}
            aria-expanded={guide}
            disabled={!ready}
          >
            Size guide ↗
          </button>
        </div>
        {guide && (
          <div className="size-guide">
            <p>Relaxed, true-to-size fit. Choose your usual size.</p>
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest (cm)</th>
                  <th>Waist (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["S", "84–90", "66–72"],
                  ["M", "90–96", "72–78"],
                  ["L", "96–102", "78–84"],
                  ["XL", "102–110", "84–92"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="size-options">
          {product.variants
            .filter((v) => v.color === variant.color)
            .map((v) => (
              <button
                key={v.id}
                className={v.size === size ? "selected" : ""}
                disabled={!ready || !v.stock}
                onClick={() => {
                  setSelectedVariant(v.id);
                  setAdded(false);
                }}
                aria-pressed={v.size === size}
              >
                {v.size}
              </button>
            ))}
        </div>
        <p className="stock-note">
          {variant.stock > 0
            ? `Small batch · ${variant.stock} pieces available in ${size}`
            : "This size has sold out"}
        </p>
        <button
          className="button full"
          disabled={!ready || !variant.stock}
          onClick={() => {
            add({
              variantId: variant.id,
              productId: product.id,
              name: product.name,
              size,
              color: variant.color,
              price: product.price,
              quantity: 1,
              image: product.image,
              stock: variant.stock,
            });
            setAdded(true);
          }}
        >
          {added ? "Added to your bag ✓" : "Add to bag"}
          <span>↗</span>
        </button>
        {added && (
          <p className="added-notice" role="status">
            <Link href="/cart">View your bag and checkout →</Link>
          </p>
        )}
        <div className="detail-promises">
          <span>↺ 30-day returns</span>
          <span>◇ Natural materials</span>
          <span>↗ Free delivery $150+</span>
        </div>
        <details open>
          <summary>Materials & care</summary>
          <p>
            {product.material}. Wash gently at 30°C, air dry and wear again. A
            little care goes a long way.
          </p>
        </details>
        <details>
          <summary>Delivery & returns</summary>
          <p>
            Standard delivery is $8, complimentary on orders $150 and above.
            Orders are prepared within 2–3 working days. Demo store: no physical
            fulfillment takes place.
          </p>
        </details>
      </div>
    </div>
  );
}
