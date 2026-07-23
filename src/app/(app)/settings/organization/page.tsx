import { ArrowRight, Building2, Clock3, Fingerprint } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { fr } from "@/lib/i18n/fr";

export default async function OrganizationSettingsPage() {
  const context = await requireAppAuthContext();
  assertOrganizationPermission(context.membership.role, "organization:read");

  const fields = [
    { label: fr.settings.name, value: context.organization.name, icon: Building2 },
    { label: fr.settings.slug, value: context.organization.slug, icon: Fingerprint },
    { label: fr.settings.timezone, value: context.organization.timezone, icon: Clock3 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header>
        <p className="text-sm font-semibold text-primary">{fr.settings.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
          {fr.settings.organizationTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{fr.settings.organizationDescription}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{context.organization.name}</CardTitle>
          <CardDescription>{fr.roles[context.membership.role]}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-background p-4">
              <Icon className="size-4 text-primary" aria-hidden="true" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 break-words text-sm font-semibold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-5">
        <Link
          href="/settings/members"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {fr.settings.membersLink}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href="/settings/mailboxes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {fr.settings.mailboxesLink}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {["admin", "direction", "sales_manager"].includes(context.membership.role) ? (
          <Link
            href="/settings/compliance"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Conformité et rétention
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
