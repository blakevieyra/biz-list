import { Card, PageHeader } from "@/components/ui";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Terms of use"
        description="Rules for using BizList."
      />
      <Card className="space-y-4 text-sm leading-relaxed text-muted">
        <p>
          By using BizList you agree to post accurate business information, respect other members, and
          comply with applicable laws. Paid plans renew according to your billing selection until
          canceled.
        </p>
        <p>
          BizList provides a platform for discovery and connection. We do not guarantee hiring
          outcomes, sales, or partnership results.
        </p>
        <p>We may update these terms; continued use means you accept the current version.</p>
      </Card>
    </div>
  );
}
