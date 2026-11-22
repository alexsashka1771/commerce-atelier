import { requireAdmin, failure } from "@/lib/http";
import { saveImages, boundedFormData } from "@/lib/uploads";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    if (
      Number(request.headers.get("content-length")) >
      10 * 1024 * 1024 + 100000
    )
      throw new Error("Upload is too large");
    const form = await boundedFormData(request);
    const files = form.getAll("images");
    if (
      !files.length ||
      files.length > 5 ||
      files.some((f) => !(f instanceof File))
    )
      throw new Error("Select 1–5 image files");
    for (const file of files as File[])
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Each image must be at most 2 MB");
    const images = await Promise.all(
      (files as File[]).map(async (file) => ({
        data: Buffer.from(await file.arrayBuffer()),
        mime: file.type,
      })),
    );
    return Response.json({ images: saveImages(images) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
