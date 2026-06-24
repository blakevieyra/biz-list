import Link from "next/link";
import { redirect } from "next/navigation";
import { CollaborationCard } from "@/components/collaboration-card";
import { createWorkGroup } from "@/lib/actions/business";
import { getAuthUserId } from "@/lib/actions/auth";
import { Card, PageHeader } from "@/components/ui";
import { getCollaborations } from "@/lib/data";
import { getWorkGroups } from "@/lib/data/business";

export default async function CollaboratePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "groups" ? "groups" : "ideas";
  const userId = await getAuthUserId();

  const [collaborations, groups] = await Promise.all([
    getCollaborations(),
    getWorkGroups(),
  ]);

  function tabHref(next: "ideas" | "groups") {
    return next === "ideas" ? "/partnerships" : "/partnerships?tab=groups";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Partnerships & Partnerships"
        description="Share ideas, form work groups, explore joint ventures, and connect with local businesses for B2B sales and contracts."
        action={
          tab === "ideas" ? (
            <Link
              href="/partnerships/new"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Propose an idea
            </Link>
          ) : undefined
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href={tabHref("ideas")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === "ideas"
              ? "bg-accent text-white"
              : "border border-border bg-card text-muted hover:text-foreground"
          }`}
        >
          Shared ideas
        </Link>
        <Link
          href={tabHref("groups")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === "groups"
              ? "bg-accent text-white"
              : "border border-border bg-card text-muted hover:text-foreground"
          }`}
        >
          Work groups
        </Link>
      </div>

      {tab === "ideas" && (
        <>
          <div className="mb-10 rounded-2xl border border-border bg-teal-50 p-6">
            <h2 className="font-semibold">How B2B collaboration works</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted">
              <li>Post a deal, partnership, or joint venture idea</li>
              <li>Local businesses discover it in the directory and community</li>
              <li>Connect, message, and negotiate contracts together</li>
            </ol>
          </div>

          {collaborations.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">No ideas posted yet. Be the first to propose a partnership.</p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {collaborations.map((idea) => (
                <CollaborationCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "groups" && (
        <>
          {userId ? (
            <Card>
              <h2 className="font-semibold">Start a work group</h2>
              <p className="mt-1 text-sm text-muted">
                Form a group around business planning, B2B deals, hiring, or local initiatives.
              </p>
              <form
                action={async (formData) => {
                  "use server";
                  await createWorkGroup({
                    title: String(formData.get("title") ?? ""),
                    focusArea: String(formData.get("focusArea") ?? "deals"),
                    description: String(formData.get("description") ?? ""),
                    location: String(formData.get("location") ?? ""),
                  });
                  redirect("/partnerships?tab=groups");
                }}
                className="mt-4 space-y-3"
              >
                <input
                  name="title"
                  required
                  placeholder="Group title"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <select name="focusArea" className="w-full rounded-lg border border-border px-3 py-2 text-sm">
                  <option value="deals">B2B deals & contracts</option>
                  <option value="planning">Business planning</option>
                  <option value="hiring">Hiring & talent</option>
                  <option value="local">Local initiatives</option>
                </select>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="What is this group working on?"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  name="location"
                  placeholder="City, state (optional)"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Create group
                </button>
              </form>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-muted">
                <Link href="/auth/login" className="text-accent hover:underline">
                  Sign in
                </Link>{" "}
                to create a work group for B2B deals and partnerships.
              </p>
            </Card>
          )}

          <div className="mt-8 space-y-4">
            {groups.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">No work groups yet. Start one for your next local deal.</p>
              </Card>
            ) : (
              groups.map((group) => (
                <Card key={group.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{group.title}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
                      {group.focusArea}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      {group.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    by {group.creatorName}
                    {group.location ? ` · ${group.location}` : ""}
                  </p>
                  <p className="mt-3 text-sm">{group.description}</p>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
