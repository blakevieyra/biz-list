import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerActions } from "@/components/customer-actions";
import { Card, PageHeader } from "@/components/ui";
import { getAuthUserId } from "@/lib/actions/auth";
import { getProfileById } from "@/lib/data";
import { FORUM_CATEGORY_LABELS } from "@/lib/types";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, userId] = await Promise.all([getProfileById(id), getAuthUserId()]);

  if (!profile || profile.role !== "customer") {
    notFound();
  }

  const initials = profile.displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/feed" className="text-sm text-accent hover:underline">
        ← Back to feed
      </Link>

      <PageHeader
        title={profile.displayName}
        description={profile.headline || "Community member on BizList"}
        action={<CustomerActions userId={profile.id} currentUserId={userId} />}
      />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        {profile.isSeekingWork && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
            Open to work
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-muted">
          {profile.city}, {profile.state}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-teal-50 text-xl font-bold text-accent">
                {initials || "?"}
              </div>
              <div>
                <h2 className="font-semibold">About</h2>
                <p className="mt-3 text-sm leading-relaxed">
                  {profile.bio || "No bio yet."}
                </p>
              </div>
            </div>
          </Card>

          {profile.skills.length > 0 && (
            <Card>
              <h2 className="font-semibold">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-muted"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {profile.interestTags.length > 0 && (
            <Card>
              <h2 className="font-semibold">Interests</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.interestTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {profile.forumInterests.length > 0 && (
            <Card>
              <h2 className="font-semibold">Forum topics</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.forumInterests.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm text-accent"
                  >
                    {FORUM_CATEGORY_LABELS[category]}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Connect</h2>
            <p className="mt-3 text-sm text-muted">
              Message {profile.displayName.split(" ")[0]} to learn more, ask about opportunities,
              or start a local collaboration.
            </p>
            <div className="mt-4">
              <CustomerActions userId={profile.id} currentUserId={userId} />
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold">Location</h2>
            <p className="mt-3 text-sm font-medium">
              {profile.city}, {profile.state}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
