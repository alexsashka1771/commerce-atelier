import { cookies } from "next/headers";
import { createSession, verifyPassword, revokeSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { failure, sameOrigin } from "@/lib/http";
const attempts = new Map<string, { count: number; reset: number }>();
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const ip = request.headers.get("x-forwarded-for") || "local";
    const now = Date.now();
    const a = attempts.get(ip);
    if (a && a.reset > now && a.count >= 10)
      return Response.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    const data = await request.json();
    attempts.set(ip, {
      count: a && a.reset > now ? a.count + 1 : 1,
      reset: a && a.reset > now ? a.reset : now + 900000,
    });
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH)
      throw new Error("Run npm run setup to configure an administrator");
    if (
      typeof data.password !== "string" ||
      data.password.length > 256 ||
      data.email !== process.env.ADMIN_EMAIL ||
      !verifyPassword(data.password, process.env.ADMIN_PASSWORD_HASH)
    )
      return Response.json(
        { error: "Email or password is incorrect" },
        { status: 401 },
      );
    attempts.delete(ip);
    (await cookies()).set("atelier-admin", createSession(getStore()), {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 28800,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const c = await cookies();
    revokeSession(getStore(), c.get("atelier-admin")?.value || "");
    c.delete("atelier-admin");
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
