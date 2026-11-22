import { isAdmin } from "@/lib/http";
import { getStore } from "@/lib/store";
import { AdminLogin, AdminView } from "@/components/admin-view";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Studio workspace",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  if (!(await isAdmin()))
    return (
      <div className="page-container">
        <AdminLogin />
      </div>
    );
  const s = getStore();
  return (
    <div className="page-container">
      <AdminView
        initialProducts={s.products(true)}
        initialOrders={s.orders()}
        initialCategories={s.categories(true)}
        initialInquiries={s.inquiries()}
      />
    </div>
  );
}
