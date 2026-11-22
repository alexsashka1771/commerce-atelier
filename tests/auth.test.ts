import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Store } from "../src/lib/store";
import {
  hashPassword,
  verifyPassword,
  createSession,
  validSession,
  revokeSession,
} from "../src/lib/auth";
test("salted password hashes accept only the correct password", () => {
  const p = randomBytes(20).toString("hex");
  const hash = hashPassword(p);
  assert.equal(verifyPassword(p, hash), true);
  assert.equal(verifyPassword(p + "x", hash), false);
  assert.notEqual(hashPassword(p), hash);
});
test("opaque admin sessions expire and can be revoked", () => {
  const s = new Store(":memory:");
  const token = createSession(s, 1000);
  assert.equal(validSession(s, token, 1001), true);
  assert.equal(validSession(s, token, 1000 + 8 * 3600000 + 1), false);
  revokeSession(s, token);
  assert.equal(validSession(s, token, 1001), false);
  s.close();
});
test("arbitrary cookie values cannot authorize admin access", () => {
  const s = new Store(":memory:");
  assert.equal(validSession(s, "forged-token"), false);
  s.close();
});
