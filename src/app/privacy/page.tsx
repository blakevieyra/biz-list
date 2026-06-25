import { Card, PageHeader } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Privacy"
        description="How AllConnect handles your information."
      />
      <Card className="space-y-4 text-sm leading-relaxed text-muted">
        <p>
          We collect account details, profile information, and activity needed to run listings,
          messaging, alerts, and billing.
        </p>
        <p>
          We use your email for account verification, notifications you opt into, and service
          messages. Payment data is processed by Stripe; we do not store full card numbers.
        </p>
        <p>
          You can update profile preferences and notification settings from My profile. Contact
          Support to request account deletion.
        </p>
      </Card>
    </div>
  );
}
