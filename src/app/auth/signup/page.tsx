import Link from "next/link";
import { SignUpForm } from "@/components/auth-forms";
import { LogoMark } from "@/components/logo";
import { PageHeader } from "@/components/ui";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <LogoMark className="mb-10" size="xl" />
      <PageHeader
        title="Create your account"
        description="We'll email you a one-time verification link before your account is created."
      />
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
