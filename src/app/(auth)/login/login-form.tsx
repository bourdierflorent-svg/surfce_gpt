"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/lib/i18n/fr";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="mt-2 w-full" disabled={pending}>
      {pending ? fr.login.submitting : fr.login.submit}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const emailError = state.fieldErrors.email?.[0];
  const passwordError = state.fieldErrors.password?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold">
          {fr.login.emailLabel}
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={fr.login.emailPlaceholder}
            className="pl-10"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : undefined}
          />
        </div>
        {emailError ? (
          <p id="email-error" className="text-sm text-danger">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold">
          {fr.login.passwordLabel}
        </label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
            className="pl-10"
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "password-error" : undefined}
          />
        </div>
        {passwordError ? (
          <p id="password-error" className="text-sm text-danger">
            {passwordError}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          className="rounded-lg border border-danger/20 bg-danger/8 px-3 py-2.5 text-sm text-danger"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
