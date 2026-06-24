import Link from "next/link";
import { ResendVerificationForm } from "@/components/auth-forms";
import { LogoMark } from "@/components/logo";
import { Card } from "@/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "That verification link is invalid or has already been used.",
  expired: "That verification link has expired. Request a new one below.",
  exists: "An account with this email already exists. You can sign in instead.",
  failed: "We could not finish creating your account. Please try again or contact support.",
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ? decodeURIComponent(params.email) : "";
  const errorKey = params.error ?? "";
  const errorMessage = ERROR_MESSAGES[errorKey];

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12 sm:px-6">
      <LogoMark className="mb-8" />

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Step 2 of 3
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          We sent a verification link from BizList
          {email ? (
            <>
              {" "}
              to <span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            " to your inbox"
          )}
          . Click the link to verify your email and finish creating your account.
        </p>
      </div>

      <ol className="mb-8 space-y-3">
        <OnboardingStep done label="Enter your details" />
        <OnboardingStep active label="Verify your email" detail="Open the link we sent you" />
        <OnboardingStep label="Complete your profile" detail="Choose business or customer" />
      </ol>

      {errorMessage && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      <Card>
        <h2 className="font-semibold">Didn&apos;t get the email?</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>• Check spam or promotions folders</li>
          <li>• Make sure {email || "your email"} is spelled correctly</li>
          <li>• Wait a minute, then resend below</li>
        </ul>
        {email ? (
          <div className="mt-5">
            <ResendVerificationForm email={email} />
          </div>
        ) : (
          <Link
            href="/auth/signup"
            className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline"
          >
            Start signup again
          </Link>
        )}
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        Wrong address?{" "}
        <Link href="/auth/signup" className="text-accent hover:underline">
          Sign up with a different email
        </Link>
      </p>
    </div>
  );
}

function OnboardingStep({
  label,
  detail,
  done,
  active,
}: {
  label: string;
  detail?: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        active
          ? "border-accent bg-blue-50/60"
          : done
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-border bg-card"
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-accent text-white"
              : "bg-slate-200 text-muted"
        }`}
      >
        {done ? "✓" : active ? "2" : "3"}
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
    </li>
  );
}
