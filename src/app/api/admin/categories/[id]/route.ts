import { getStore } from "@/lib/store";
import { requireAdmin, failure } from "@/lib/http";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    getStore().updateCategory(id, await request.json());
    return Response.json({ categories: getStore().categories(true) });
  } catch (error) {
    return failure(error);
  }
}
