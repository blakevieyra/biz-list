"use client";

import { useActionState } from "react";
import { signIn, signUp } from "@/lib/actions/auth";
import { Card } from "./ui";

const initialState = { error: undefined as string | undefined };

export function SignInForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await signIn(formData);
      return { error: result?.error };
    },
    initialState,
  );

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </Card>
  );
}

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await signUp(formData);
      return { error: result?.error };
    },
    initialState,
  );

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <Field label="Display name" name="displayName" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
