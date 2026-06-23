import Link from "next/link";
import { SignInForm } from "@/components/auth-forms";
import { PageHeader } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <PageHeader
        title="Sign in"
        description="Access your profile, messages, and community posts."
      />
      <SignInForm />
      <p className="mt-6 text-center text-sm text-muted">
        New to AllConnect?{" "}
        <Link href="/auth/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
