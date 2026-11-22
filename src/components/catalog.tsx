"use client";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/store";
import { money } from "@/lib/format";
import { SavePiece } from './saved-pieces';
export function ProductCard({
  product,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <article className="product-frame"><Link
      className="product-card"
      href={`/product/${product.id}`}
    >
      <div className="product-image">
        <img
          src={product.image}
          alt={`${product.name} in ${product.color}`}
          width="600"
          height="760"
          loading="lazy"
        />
        <span className="product-arrow" aria-hidden="true">
          ↗
        </span>
      </div>
      <div className="product-heading">
        <h3>{product.name}</h3>
        <span>{money(product.price)}</span>
      </div>
      <p>{product.material}</p>
      <div className="color-line">
        <i
          className={`swatch ${product.color.toLowerCase()}`}
          aria-hidden="true"
        />
        {product.color} · {product.variants.filter((variant) => variant.stock > 0).length ? [...new Set(product.variants.filter((variant) => variant.stock > 0).map((variant) => variant.size))].join(" / ") : "Sold out"}
      </div>
      <span className="product-action">View details <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></span>
    </Link><SavePiece product={product}/></article>
  );
}
export function Catalog({
  products,
  initialCategory = "All pieces",
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState("");
  const categories = [
    "All pieces",
    ...new Set(products.map((p) => p.category)),
  ];
  const visible = products
    .filter(
      (p) =>
        (category === "All pieces" || p.category === category) &&
        `${p.name} ${p.material}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : b.featured - a.featured,
    );
  return (
    <>
      <div className="catalog-tools">
        <div className="category-tabs" role="group" aria-label="Categories">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="catalog-inputs">
          <label className="catalog-field">Search pieces
          <input
            aria-label="Search collection"
            placeholder="Find a piece…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          </label><label className="catalog-field">Sort by
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Studio selection</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
          </label>
        </div>
      </div>
      <div className="result-count" role="status"><span>{visible.length} pieces{category !== 'All pieces' ? ` in ${category}` : ''}</span>{(search || category !== 'All pieces') && <button className="clear-filters" onClick={()=>{setSearch('');setCategory('All pieces');setSort('featured');}}>Clear filters</button>}</div>
      {visible.length ? (
        <div className="product-grid">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Nothing here, just yet.</h2>
          <p>Try another search or explore all pieces.</p>
          <button
            className="button"
            onClick={() => {
              setSearch("");
              setCategory("All pieces");
            }}
          >
            See all pieces
          </button>
        </div>
      )}
    </>
  );
}
