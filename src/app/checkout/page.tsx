import { CheckoutView } from "@/components/checkout-view";
export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };
export default function CheckoutPage() {
  return (
    <div className="page-container">
      <CheckoutView
        stripeEnabled={Boolean(
          process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
        )}
      />
    </div>
  );
}
