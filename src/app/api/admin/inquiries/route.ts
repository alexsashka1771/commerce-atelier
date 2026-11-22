import { getStore } from "@/lib/store";
import { requireAdmin, failure } from "@/lib/http";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json({ inquiries: getStore().inquiries() });
  } catch (error) {
    return failure(error);
  }
}
