import { requireAdmin, failure } from "@/lib/http";
import { getStore } from "@/lib/store";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const { status } = await request.json();
    return Response.json({ order: getStore().transition(id, status) });
  } catch (error) {
    return failure(error);
  }
}
