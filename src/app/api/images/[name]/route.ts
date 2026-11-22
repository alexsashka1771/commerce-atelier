import { readFileSync } from "node:fs";
import { join } from "node:path";
import { safeImageName, uploadDirectory } from "@/lib/uploads";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!safeImageName(name)) return new Response("Not found", { status: 404 });
  try {
    const bytes = readFileSync(join(uploadDirectory(), name));
    const type = name.endsWith(".png")
      ? "image/png"
      : name.endsWith(".jpg")
        ? "image/jpeg"
        : "image/webp";
    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public,max-age=31536000,immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
