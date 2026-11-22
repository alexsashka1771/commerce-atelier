import { getStore } from "@/lib/store";
import { requireAdmin, failure } from "@/lib/http";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json({ categories: getStore().categories(true) });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const { name } = await request.json();
    return Response.json(
      { category: getStore().createCategory(name) },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}
