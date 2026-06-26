import Link from "next/link";
import { redirect } from "next/navigation";
import { NewCollaborationForm } from "@/components/new-collaboration-form";
import { getCurrentProfile } from "@/lib/data";
import type { CollaborationType } from "@/lib/types";

export default async function NewCollaborationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  const isBusinessAccount = profile.role === "business" || profile.role === "organization";
  if (!isBusinessAccount) {
    redirect("/partnerships");
  }

  const params = await searchParams;
  const initialType: CollaborationType =
    params.type === "contract" || params.type === "b2b_sale" ? params.type : "proposal";

  const backHref =
    initialType === "proposal" ? "/partnerships" : `/partnerships?tab=${initialType}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href={backHref} className="text-sm text-accent hover:underline">
        ← Back
      </Link>
      <div className="mt-6 mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">BizList · Collaborations</p>
      </div>
      <NewCollaborationForm initialType={initialType} />
    </div>
  );
}
