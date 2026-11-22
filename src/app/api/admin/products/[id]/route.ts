import { requireAdmin, failure } from "@/lib/http";
import { getStore } from "@/lib/store";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    return Response.json({
      product: getStore().updateProduct(id, await request.json()),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    getStore().archiveProduct(id, true);
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    getStore().archiveProduct(id, false);
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
