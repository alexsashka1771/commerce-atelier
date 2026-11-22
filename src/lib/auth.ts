import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type { Store } from "./store";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, value] = hash.split(":");
  if (!salt || !value || value.length !== 128) return false;
  const expected = Buffer.from(value, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function createSession(store: Store, now = Date.now()) {
  const token = randomBytes(32).toString("hex");
  store.db.prepare("DELETE FROM sessions WHERE expires<?").run(now);
  store.db
    .prepare("INSERT INTO sessions VALUES(?,?)")
    .run(digest(token), now + 8 * 3600000);
  return token;
}
export function validSession(store: Store, token: string, now = Date.now()) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  return Boolean(
    store.db
      .prepare("SELECT tokenHash FROM sessions WHERE tokenHash=? AND expires>?")
      .get(digest(token), now),
  );
}
export function revokeSession(store: Store, token: string) {
  store.db.prepare("DELETE FROM sessions WHERE tokenHash=?").run(digest(token));
}
