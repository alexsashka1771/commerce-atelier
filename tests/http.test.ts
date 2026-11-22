import test from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../src/lib/http";
test("same-origin check accepts canonical Next URL with the original Host header", () => {
  const request = new Request("http://localhost:3102/api/checkout", {
    headers: { Origin: "http://127.0.0.1:3102", Host: "127.0.0.1:3102" },
  });
  assert.doesNotThrow(() => sameOrigin(request));
});
test("same-origin check rejects an external browser origin", () => {
  const request = new Request("http://localhost:3102/api/checkout", {
    headers: { Origin: "https://untrusted.example", Host: "127.0.0.1:3102" },
  });
  assert.throws(() => sameOrigin(request), /Cross-origin/);
});
