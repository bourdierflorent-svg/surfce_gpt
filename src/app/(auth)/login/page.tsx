import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { SurfceLogo } from "@/components/layout/surfce-logo";
import { fr } from "@/lib/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isConfigured = isSupabaseConfigured();
  const hasMissingOrganization = params.error === "missing_organization";

  return (
    <main className="grid min-h-screen bg-card lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-foreground p-12 text-primary-foreground lg:flex lg:flex-col">
        <SurfceLogo className="[&_span]:text-white" />
        <div className="my-auto max-w-xl pb-16 pt-24">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            {fr.login.eyebrow}
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            {fr.login.title}
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-white/68">{fr.login.description}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm text-white/72">
          {fr.login.steps.map((label, index) => (
            <div key={label} className="border-t border-white/15 pt-3">
              <span className="mb-2 block text-xs font-bold text-white/35">0{index + 1}</span>
              {label}
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute -bottom-48 -right-48 size-[34rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 size-80 rounded-full border border-white/10" />
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <SurfceLogo className="mb-14 lg:hidden" />
          <p className="text-sm font-semibold text-primary">{fr.login.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{fr.login.formTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{fr.login.formDescription}</p>

          <div className="mt-8">
            {hasMissingOrganization ? (
              <p
                className="mb-5 rounded-lg border border-warning/25 bg-warning/8 px-3 py-2.5 text-sm"
                role="alert"
              >
                {fr.errors.missingOrganization}
              </p>
            ) : null}
            <LoginForm />
          </div>

          {!isConfigured ? (
            <div className="mt-7 rounded-xl border border-border bg-background p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">{fr.login.configurationRequired}</p>
                  <Link
                    href="/dashboard"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {fr.login.previewLink}
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
