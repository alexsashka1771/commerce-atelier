import { getStore } from "@/lib/store";
import { requireAdmin, failure } from "@/lib/http";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json({ products: getStore().products(true) });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json(
      { product: getStore().createProduct(await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}
