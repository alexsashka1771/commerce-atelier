import { cookies } from "next/headers";
import { getStore } from "./store";
import { validSession } from "./auth";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const internal = new URL(request.url);
  const host = request.headers.get("host") || internal.host;
  const expected = `${internal.protocol}//${host}`;
  if (origin && origin !== expected)
    throw new Error("Cross-origin request rejected");
}
export async function isAdmin() {
  return validSession(
    getStore(),
    (await cookies()).get("atelier-admin")?.value || "",
  );
}
export async function requireAdmin(request: Request) {
  sameOrigin(request);
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
export function failure(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Request failed";
  return Response.json(
    { error: message },
    { status: message === "Unauthorized" ? 401 : status },
  );
}
