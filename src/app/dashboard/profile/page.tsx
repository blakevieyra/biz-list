import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessProfileEditor } from "@/components/business-profile-editor";
import { ProfilePreferencesPanel } from "@/components/profile-preferences-panel";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getBusinessByOwnerId, getCurrentProfile } from "@/lib/data";
import { hasBizListPlusPerks } from "@/lib/plans";

export default async function DashboardProfilePage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  const isBusiness = profile.role !== "customer";
  const business = isBusiness ? await getBusinessByOwnerId(userId) : null;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your personal info, preferences, and business listing details."
        action={
          isBusiness ? (
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Plans & billing
            </Link>
          ) : undefined
        }
      />

      {/* Personal profile — shown for all users */}
      <div className="mb-8">
        <ProfilePreferencesPanel
          profile={profile}
          variant={hasBizListPlusPerks(profile.planTier) ? "BizList-plus" : "full"}
        />
      </div>

      {/* Business listing editor — shown for business accounts */}
      {isBusiness && (
        <>
          <div className="mb-4 border-t border-border pt-8">
            <h2 className="text-lg font-semibold">Business listing</h2>
            <p className="mt-1 text-sm text-muted">Edit your public listing, photos, services, and directory details.</p>
          </div>
          {business ? (
            <BusinessProfileEditor business={business} displayName={profile.displayName} avatarUrl={profile.avatarUrl} />
          ) : (
            <p className="text-sm text-muted">
              You don&apos;t have a business listing yet.{" "}
              <Link href="/profile/create" className="text-accent hover:underline">
                Complete onboarding
              </Link>{" "}
              to create one.
            </p>
          )}
        </>
      )}
    </>
  );
}
