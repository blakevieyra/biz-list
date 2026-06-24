import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessProfileEditor } from "@/components/business-profile-editor";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId, getCurrentProfile } from "@/lib/data";

export default async function DashboardProfilePage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const business = await getBusinessByOwnerId(userId);

  if (!business) {
    return (
      <>
        <PageHeader
          title="Business profile"
          description="Set up your listing to manage products, photos, and directory details."
        />
        <p className="text-sm text-muted">
          You don&apos;t have a business listing yet.{" "}
          <Link href="/profile/create" className="text-accent hover:underline">
            Complete onboarding
          </Link>{" "}
          to create one.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Business profile"
        description="Update your directory listing, products & services, photos, and contact details."
        action={
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Plans & billing
          </Link>
        }
      />
      <BusinessProfileEditor business={business} displayName={profile.displayName} />
    </>
  );
}
