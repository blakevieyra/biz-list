import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Help"
        description="Quick answers for getting started on BizList."
      />
      <Card className="space-y-4 text-sm leading-relaxed text-muted">
        <p>
          Browse <Link href="/listings" className="text-accent hover:underline">listings</Link>, follow
          businesses from the{" "}
          <Link href="/home?tab=latest" className="text-accent hover:underline">latest feed</Link>, and
          manage your account from{" "}
          <Link href="/profile" className="text-accent hover:underline">My profile</Link>.
        </p>
        <p>
          Businesses can publish posts, events, and job openings from the{" "}
          <Link href="/dashboard" className="text-accent hover:underline">dashboard</Link>.
        </p>
        <p>
          Need more help? Contact us through{" "}
          <Link href="/support" className="text-accent hover:underline">Support</Link>.
        </p>
      </Card>
    </div>
  );
}
