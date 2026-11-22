"use client";
import { useState } from "react";
import type { Category, Product } from "@/lib/store";
import { productAssets } from "@/lib/assets";
import { variantEdits, type EditableVariant } from "@/lib/inventory-edit";

export function ProductForm({
  product,
  categories,
  onSaved,
}: {
  product?: Product;
  categories: Category[];
  onSaved: () => void;
}) {
  const [images, setImages] = useState(product?.images || [productAssets[0]]);
  const [baseline, setBaseline] = useState(product?.variants || []);
  const [variants, setVariants] = useState<EditableVariant[]>(
    product?.variants || [
      { size: "S", color: "Oat", stock: 12 },
      { size: "M", color: "Oat", stock: 12 },
    ],
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const data = new FormData();
    for (const file of files) data.append("images", file);
    try {
      const r = await fetch("/api/admin/uploads", {
        method: "POST",
        body: data,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (images.length + d.images.length > 6)
        throw new Error(
          "Uploaded successfully. Choose at most six gallery images; remove a selection and upload again if needed.",
        );
      setImages((current) => [...current, ...d.images]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.get("name"),
            category: f.get("category"),
            price: Math.round(Number(f.get("price")) * 100),
            material: f.get("material"),
            description: f.get("description"),
            images,
            variants: product ? variantEdits(variants, baseline) : variants,
          }),
        },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSaved(true);
      setVariants(d.product.variants);
      setBaseline(d.product.variants);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Product save failed");
    } finally {
      setBusy(false);
    }
  }
  function changeVariant(
    index: number,
    key: "size" | "color" | "stock",
    value: string | number,
  ) {
    setVariants((current) =>
      current.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    );
  }
  async function reloadInventory() {
    try {
      const response = await fetch("/api/admin/products");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const latest = data.products.find((p: Product) => p.id === product?.id);
      if (latest) {
        setVariants(latest.variants);
        setBaseline(latest.variants);
        setError("");
        setSaved(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stock reload failed");
    }
  }
  return (
    <form className="product-management-form" onSubmit={save}>
      <div className="form-row">
        <label>
          Product name
          <input
            name="name"
            required
            minLength={3}
            maxLength={120}
            defaultValue={product?.name}
          />
        </label>
        <label>
          Category
          <select
            name="category"
            defaultValue={product?.category || categories[0]?.name}
            required
          >
            {categories
              .filter((c) => c.active || c.name === product?.category)
              .map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Price (USD)
          <input
            name="price"
            type="number"
            min="0.01"
            max="10000"
            step="0.01"
            required
            defaultValue={product ? product.price / 100 : 88}
          />
        </label>
        <label>
          Material
          <input
            name="material"
            required
            minLength={3}
            maxLength={120}
            defaultValue={product?.material || "Organic cotton"}
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={product?.description || ""}
        />
      </label>
      <fieldset>
        <legend>Gallery — first image is the cover</legend>
        <div className="gallery-selection">
          {images.map((image, index) => (
            <div key={image}>
              <img
                src={image}
                alt={`Selected image ${index + 1}`}
                width="70"
                height="90"
              />
              <div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setImages((current) => [
                      image,
                      ...current.filter((i) => i !== image),
                    ])
                  }
                >
                  {index === 0 ? "Cover" : "Make cover"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setImages((current) => current.filter((i) => i !== image))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <span className="small-note">
          Choose original local assets below or upload PNG, JPEG or WebP. Up to
          six gallery images.
        </span>
        <div className="asset-picker">
          {productAssets.map((image) => (
            <button
              type="button"
              className={images.includes(image) ? "selected" : ""}
              key={image}
              onClick={() =>
                setImages((current) =>
                  current.includes(image)
                    ? current.filter((i) => i !== image)
                    : current.length < 6
                      ? [...current, image]
                      : current,
                )
              }
              aria-pressed={images.includes(image)}
            >
              <img
                src={image}
                alt={image.split("/").pop()?.replace(".svg", "")}
                width="60"
                height="76"
              />
            </button>
          ))}
        </div>
        <label className="upload-label">
          {uploading ? "Uploading…" : "Upload images (≤2 MB each, up to 5)"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={upload}
            disabled={uploading || images.length >= 6}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Size, color and stock — each combination is independent</legend>
        {product && (
          <button
            type="button"
            className="text-button"
            onClick={reloadInventory}
          >
            Reload latest stock ↻
          </button>
        )}
        {variants.map((variant, index) => (
          <div className="variant-editor" key={variant.id || index}>
            <label>
              Size
              <select
                value={variant.size}
                onChange={(e) => changeVariant(index, "size", e.target.value)}
              >
                {["XS", "S", "M", "L", "XL", "XXL", "One size"].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <label>
              Color
              <input
                value={variant.color}
                required
                minLength={2}
                maxLength={40}
                onChange={(e) => changeVariant(index, "color", e.target.value)}
              />
            </label>
            <label>
              Available stock
              <input
                type="number"
                min="0"
                max="10000"
                required
                value={variant.stock}
                onChange={(e) =>
                  changeVariant(index, "stock", Number(e.target.value))
                }
              />
            </label>
            <button
              type="button"
              className="text-button"
              disabled={variants.length === 1}
              onClick={() =>
                setVariants((current) => current.filter((_, i) => i !== index))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button compact outline"
          disabled={variants.length >= 24}
          onClick={() =>
            setVariants((current) => [
              ...current,
              { size: "L", color: "New color", stock: 0 },
            ])
          }
        >
          Add a variant +
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button compact" disabled={busy || uploading}>
        {busy ? "Saving…" : product ? "Save product" : "Create product"} ↗
      </button>
      {saved && (
        <span className="saved-note" role="status">
          Saved ✓
        </span>
      )}
    </form>
  );
}

export function AdminProducts({
  products,
  categories,
  onProducts,
}: {
  products: Product[];
  categories: Category[];
  onProducts: (products: Product[]) => void;
}) {
  const [error, setError] = useState("");
  async function refresh() {
    const r = await fetch("/api/admin/products");
    const d = await r.json();
    if (r.ok) onProducts(d.products);
  }
  async function archive(product: Product) {
    setError("");
    try {
      const r = await fetch(`/api/admin/products/${product.id}`, {
        method: product.active ? "DELETE" : "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed");
    }
  }
  return (
    <div className="admin-catalog">
      <details className="create-product">
        <summary>Create a considered piece +</summary>
        <ProductForm categories={categories} onSaved={refresh} />
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {products.map((product) => (
        <details className="managed-product" key={product.id}>
          <summary>
            <img src={product.image} alt="" width="50" height="64" />
            <span>
              {product.name}
              <small>
                {product.category} · {product.active ? "Active" : "Archived"} ·{" "}
                {product.variants.length} variants
              </small>
            </span>
            <span>{product.active ? "Edit piece" : "Archived"}</span>
          </summary>
          <div className="managed-product-body">
            <ProductForm
              key={product.id + product.category}
              product={product}
              categories={categories}
              onSaved={refresh}
            />
            <button
              type="button"
              className="text-button archive-button"
              onClick={() => archive(product)}
            >
              {product.active
                ? "Archive product (hide from shop)"
                : "Restore product to shop"}{" "}
              ↗
            </button>
            <p className="small-note">
              Archiving preserves order snapshots and reserved variant records.
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}

export function AdminCategories({
  categories,
  onCategories,
  onProducts,
}: {
  categories: Category[];
  onCategories: (categories: Category[]) => void;
  onProducts: (products: Product[]) => void;
}) {
  const [error, setError] = useState("");
  async function refresh() {
    const c = await (await fetch("/api/admin/categories")).json();
    const p = await (await fetch("/api/admin/products")).json();
    onCategories(c.categories);
    onProducts(p.products);
  }
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const name = new FormData(form).get("name");
    try {
      const r = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      form.reset();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Category save failed");
    }
  }
  async function update(id: string, data: unknown) {
    setError("");
    try {
      const r = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Category update failed");
    }
  }
  return (
    <div className="category-manager">
      <h2>The collection, organized.</h2>
      <form onSubmit={create} className="category-create">
        <label>
          New category
          <input
            name="name"
            minLength={2}
            maxLength={60}
            required
            placeholder="e.g. Accessories"
          />
        </label>
        <button className="button compact">Create category +</button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {categories.map((category) => (
        <form
          className="category-editor"
          key={category.id}
          onSubmit={(e) => {
            e.preventDefault();
            update(category.id, {
              name: new FormData(e.currentTarget).get("name"),
            });
          }}
        >
          <label>
            Category name
            <input
              name="name"
              minLength={2}
              maxLength={60}
              required
              defaultValue={category.name}
            />
          </label>
          <span className="status-pill">
            {category.active ? "Active" : "Archived"}
          </span>
          <button className="button compact outline">Save name</button>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              update(category.id, { active: category.active ? 0 : 1 })
            }
          >
            {category.active ? "Archive" : "Restore"}
          </button>
        </form>
      ))}
      <p className="small-note">
        A category can be archived after its active products are moved or
        archived. Renaming updates all associated products.
      </p>
    </div>
  );
}
