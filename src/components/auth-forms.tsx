"use client";

import { useActionState, useState } from "react";
import { resendSignupVerification, signIn, signUp, verifySignupOtp } from "@/lib/actions/auth";
import {
  getDisplayNameError,
  getEmailError,
  getPasswordError,
} from "@/lib/validation/auth-fields";
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
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    const password = String(new FormData(form).get("password") ?? "");
    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);
    const message = emailError ?? passwordError;
    if (message) {
      e.preventDefault();
      setClientError(message);
      return;
    }
    setClientError(null);
  }

  return (
    <Card>
      <form action={formAction} className="space-y-4" noValidate onSubmit={handleSubmit}>
        <Field label="Email" name="email" autoComplete="email" inputMode="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        {(clientError || state.error) && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {clientError ?? state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
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
  const [clientError, setClientError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const data = new FormData(form);
    const displayName = String(data.get("displayName") ?? "");
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const errors: Record<string, string> = {};
    const nameError = getDisplayNameError(displayName);
    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);

    if (nameError) errors.displayName = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    if (Object.keys(errors).length > 0) {
      e.preventDefault();
      setFieldErrors(errors);
      setClientError(Object.values(errors)[0]);
      return;
    }

    setFieldErrors({});
    setClientError(null);
  }

  return (
    <Card>
      <form action={formAction} className="space-y-4" noValidate onSubmit={handleSubmit}>
        <Field
          label="Display name"
          name="displayName"
          autoComplete="name"
          error={fieldErrors.displayName}
        />
        <Field
          label="Email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          hint="We'll send a 6-digit verification code here."
          error={fieldErrors.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={fieldErrors.password}
        />
        {(clientError || state.error) && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {clientError ?? state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Sending verification..." : "Send verification email"}
        </button>
      </form>
    </Card>
  );
}

const OTP_ERROR_MESSAGES: Record<string, string> = {
  invalid: "That code is incorrect. Double-check and try again.",
  expired: "That code has expired. Request a new one below.",
  exists: "An account with this email already exists. You can sign in instead.",
  failed: "We could not finish creating your account. Please try again.",
};

export function VerifyOtpForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, _formData: FormData) => {
      const code = String(_formData.get("code") ?? "").trim();
      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return { error: "Please enter the 6-digit code from your email." };
      }
      const result = await verifySignupOtp(email, code);
      if ("error" in result) {
        return { error: OTP_ERROR_MESSAGES[result.error] ?? OTP_ERROR_MESSAGES.failed };
      }
      return {};
    },
    {} as { error?: string },
  );

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="field-code" className="block text-sm font-medium">
            Verification code
          </label>
          <p id="field-code-hint" className="text-xs text-muted">
            Enter the 6-digit code we emailed you.
          </p>
          <input
            id="field-code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            aria-describedby="field-code-hint"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-accent focus:ring-2 focus:ring-ring"
          />
        </div>
        {state.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Verifying..." : "Verify code"}
        </button>
      </form>
    </Card>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, _formData: FormData) => {
      const result = await resendSignupVerification(email);
      if ("error" in result && result.error) return { error: result.error };
      return { success: true };
    },
    {} as { error?: string; success?: boolean },
  );

  return (
    <form action={formAction}>
      {state.error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mb-3 text-sm text-emerald-700">Verification email sent again.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Resend verification email"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  hint,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "email" | "text";
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  const id = `field-${name}`;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-border focus:border-accent"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
