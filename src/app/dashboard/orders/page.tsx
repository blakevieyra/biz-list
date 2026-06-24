import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceOrdersPanel } from "@/components/service-orders-panel";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId, getCurrentProfile } from "@/lib/data";
import { getServiceOrdersForBusiness } from "@/lib/data/business";

export default async function DashboardOrdersPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const business = await getBusinessByOwnerId(userId);
  if (!business) {
    return (
      <>
        <PageHeader
          title="Service orders"
          description="Complete your business profile to receive orders."
        />
        <p className="text-sm text-muted">
          <Link href="/dashboard/profile" className="text-accent hover:underline">
            Set up your business listing →
          </Link>
        </p>
      </>
    );
  }

  const orders = await getServiceOrdersForBusiness(business.id, userId);

  return (
    <>
      <PageHeader
        title="Service orders"
        description={`Orders placed through ${business.name}'s in-app service forms.`}
        action={
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Back to dashboard
          </Link>
        }
      />
      <ServiceOrdersPanel orders={orders} businessId={business.id} />
    </>
  );
}
