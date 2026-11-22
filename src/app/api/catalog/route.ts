import { getStore } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    products: getStore().products(),
    stripeEnabled: Boolean(
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
    ),
  });
}
