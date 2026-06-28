import { redirect } from "next/navigation";
import { CustomerProfileEditor } from "@/components/customer-profile-editor";
import { PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data";

export default async function EditProfilePage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/profile/create");

  if (profile.role === "business" || profile.role === "organization" || profile.role === "marketer") {
    redirect("/dashboard/profile");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Your profile"
        description="Update how you appear in the directory so local businesses can discover and connect with you."
      />
      <CustomerProfileEditor profile={profile} />
    </div>
  );
}
