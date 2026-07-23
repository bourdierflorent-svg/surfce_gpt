import { Building2, CheckCircle2, Database, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { fr } from "@/lib/i18n/fr";

export default async function DashboardPage() {
  const context = await requireAppAuthContext();
  const firstName = context.user.fullName?.split(" ")[0] ?? context.user.email.split("@")[0];
  const cards = [
    {
      label: fr.dashboard.cards.organizations,
      value: context.organization.name,
      status: context.isPreview ? fr.dashboard.statuses.preview : fr.dashboard.statuses.configured,
      icon: Building2,
    },
    {
      label: fr.dashboard.cards.members,
      value: fr.roles[context.membership.role],
      status: fr.dashboard.statuses.active,
      icon: CheckCircle2,
    },
    {
      label: fr.dashboard.cards.access,
      value: fr.dashboard.values.serverAndDatabase,
      status: fr.dashboard.statuses.active,
      icon: ShieldCheck,
    },
    {
      label: fr.dashboard.cards.database,
      value: fr.dashboard.values.protectedTables,
      status: fr.dashboard.statuses.protected,
      icon: Database,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">{fr.dashboard.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {fr.dashboard.title} {firstName}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          {fr.dashboard.description}
        </p>
      </header>

      <section aria-label="État du socle" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, status, value }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="mt-2 text-lg">{value}</CardTitle>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </CardHeader>
            <CardContent>
              <Badge>{status}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>{fr.dashboard.scopeTitle}</CardTitle>
            <CardDescription>{fr.dashboard.scopeDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {fr.dashboard.scopeItems.map((item) => (
                <li key={item} className="flex gap-3 rounded-lg bg-muted/65 p-3 text-sm leading-6">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary text-primary-foreground">
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/65">
              {fr.common.phase} 7
            </p>
            <CardTitle className="text-xl">{fr.dashboard.nextTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-primary-foreground/78">
              {fr.dashboard.nextDescription}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
