import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/catalog";
export const dynamic = "force-dynamic";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const product = store.product(id);
  if (!product) notFound();
  return (
    <>
      <div className="page-container">
        <ProductDetail product={product} />
      </div>
      <section className="section related-section">
        <div className="section-heading">
          <div>
            <h2>
              A few good <em>companions.</em>
            </h2>
          </div>
        </div>
        <div className="product-grid">
          {store
            .products()
            .filter((p) => p.id !== id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    </>
  );
}
