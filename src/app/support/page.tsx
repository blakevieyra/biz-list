import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Support"
        description="Get in touch with the AllConnect team."
      />
      <Card className="space-y-4 text-sm leading-relaxed text-muted">
        <p>
          For billing questions, manage your subscription from{" "}
          <Link href="/profile?tab=plans" className="text-accent hover:underline">
            Profile → Plans
          </Link>
          .
        </p>
        <p>
          For account or technical issues, email{" "}
          <a href="mailto:support@AllConnect.app" className="text-accent hover:underline">
            support@AllConnect.app
          </a>{" "}
          with your account email and a short description of the problem.
        </p>
        <p>
          See also our <Link href="/help" className="text-accent hover:underline">Help</Link> page for
          common questions.
        </p>
      </Card>
    </div>
  );
}
