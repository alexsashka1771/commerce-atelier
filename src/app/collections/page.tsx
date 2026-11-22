import { getStore } from "@/lib/store";
import { Catalog } from "@/components/catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "The collection" };
export default async function Collections({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return (
    <div className="page-container">
      <div className="page-heading collection-heading">
        <h1>
          The everyday <em>collection.</em>
        </h1>
        <p>Easy shapes. Natural textures. Your kind of essentials.</p>
      </div>
      <Catalog
        products={getStore().products()}
        initialCategory={category || "All pieces"}
      />
    </div>
  );
}
