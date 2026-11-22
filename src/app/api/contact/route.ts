import { getStore } from "@/lib/store";
import { sameOrigin, failure } from "@/lib/http";
const attempts = new Map<string, number>();
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length")) > 10000)
      throw new Error("Message too large");
    const ip = request.headers.get("x-forwarded-for") || "local";
    if ((attempts.get(ip) || 0) > Date.now())
      return Response.json(
        { error: "Please wait a minute before sending another message" },
        { status: 429 },
      );
    getStore().contact(await request.json());
    attempts.set(ip, Date.now() + 60000);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
