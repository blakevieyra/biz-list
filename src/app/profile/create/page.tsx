import { Suspense } from "react";
import { ProfileCreateWizard } from "@/components/profile-create-wizard";
import { LogoMark } from "@/components/logo";
import { getCurrentProfile } from "@/lib/data";
import { getAuthUserId } from "@/lib/actions/auth";

export default async function CreateProfilePage() {
  const userId = await getAuthUserId();
  const profile = userId ? await getCurrentProfile() : null;

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <LogoMark className="mb-4" size="lg" />
      </div>
      <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted">Loading...</div>}>
        <ProfileCreateWizard initialDisplayName={profile?.displayName ?? ""} />
      </Suspense>
    </>
  );
}
