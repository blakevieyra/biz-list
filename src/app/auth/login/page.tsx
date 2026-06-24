import Link from "next/link";
import { SignInForm } from "@/components/auth-forms";
import { LogoMark } from "@/components/logo";
import { PageHeader } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const authError = params.error === "auth";

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12 sm:px-6">
      <LogoMark className="mb-8" />
      <PageHeader
        title="Sign in"
        description="Access your profile, messages, and community posts."
      />
      {authError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Sign-in failed. Please try again or create an account.
        </p>
      )}
      <SignInForm />
      <p className="mt-6 text-center text-sm text-muted">
        New to BizList?{" "}
        <Link href="/auth/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
