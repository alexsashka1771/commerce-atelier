import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
export async function boundedFormData(
  request: Request,
  limit = 10 * 1024 * 1024 + 100000,
): Promise<FormData> {
  if (!request.body) throw new Error("Empty upload");
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Upload is too large");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  }).formData();
}
export function validateImage(
  data: Buffer,
  mime: string,
): "png" | "jpg" | "webp" {
  if (data.length > 2 * 1024 * 1024)
    throw new Error("Each image must be at most 2 MB");
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw new Error("Only PNG, JPEG and WebP images are accepted");
  if (data.length < 16) throw new Error("Invalid image header");
  if (
    mime === "image/png" &&
    data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    data.subarray(12, 16).toString() === "IHDR"
  )
    return "png";
  if (
    mime === "image/jpeg" &&
    data[0] === 255 &&
    data[1] === 216 &&
    data[2] === 255 &&
    data[data.length - 2] === 255 &&
    data[data.length - 1] === 217
  )
    return "jpg";
  if (
    mime === "image/webp" &&
    data.subarray(0, 4).toString() === "RIFF" &&
    data.subarray(8, 12).toString() === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(data.subarray(12, 16).toString())
  )
    return "webp";
  throw new Error("Image header does not match its MIME type");
}
export function safeImageName(name: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|webp)$/.test(
    name,
  );
}
export function uploadDirectory() {
  // Uploaded files are runtime data and must not be traced into server bundles.
  return resolve(
    /* turbopackIgnore: true */ process.env.UPLOAD_PATH || "./data/uploads",
  );
}
export function isUploadedImage(url: string) {
  const name = url.startsWith("/api/images/") ? url.slice(12) : "";
  return (
    safeImageName(name) &&
    existsSync(
      /* turbopackIgnore: true */ join(
        /* turbopackIgnore: true */ uploadDirectory(),
        name,
      ),
    )
  );
}
export function saveImages(images: { data: Buffer; mime: string }[]) {
  if (!images.length || images.length > 5)
    throw new Error("Select 1–5 images per upload");
  const validated = images.map((i) => ({
    ...i,
    extension: validateImage(i.data, i.mime),
  }));
  mkdirSync(uploadDirectory(), { recursive: true });
  return validated.map((i) => {
    const name = `${randomUUID()}.${i.extension}`;
    writeFileSync(
      join(/* turbopackIgnore: true */ uploadDirectory(), name),
      i.data,
      { flag: "wx" },
    );
    return `/api/images/${name}`;
  });
}
