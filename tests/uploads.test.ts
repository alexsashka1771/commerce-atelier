import test from "node:test";
import assert from "node:assert/strict";
import {
  validateImage,
  safeImageName,
  boundedFormData,
} from "../src/lib/uploads";
test("multipart body is bounded even without a content-length header", async () => {
  const request = new Request("http://localhost/upload", {
    method: "POST",
    body: "A body longer than ten bytes",
  });
  assert.equal(request.headers.has("content-length"), false);
  await assert.rejects(() => boundedFormData(request, 10), /too large/i);
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
test("upload accepts PNG by both MIME and actual magic header", () =>
  assert.equal(validateImage(png, "image/png"), "png"));
test("upload rejects oversized payload before writing", () =>
  assert.throws(
    () => validateImage(Buffer.alloc(2 * 1024 * 1024 + 1), "image/png"),
    /2 MB/i,
  ));
test("upload rejects SVG executables and MIME spoofing", () => {
  assert.throws(
    () =>
      validateImage(
        Buffer.from('<svg onload="alert(1)"></svg>'),
        "image/svg+xml",
      ),
    /PNG|JPEG|WebP/i,
  );
  assert.throws(
    () => validateImage(Buffer.from("MZ executable content"), "image/png"),
    /header/i,
  );
  assert.throws(() => validateImage(png, "image/jpeg"), /header/i);
});
test("image filename validator rejects traversal and arbitrary paths", () => {
  assert.equal(safeImageName("12345678-1234-1234-1234-123456789abc.png"), true);
  assert.equal(safeImageName("../../.env.local"), false);
  assert.equal(safeImageName("shell.exe"), false);
});
