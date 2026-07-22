import { ArrowLeft, UsersRound } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationMembers } from "@/features/organizations/server/members";
import { fr } from "@/lib/i18n/fr";

export default async function MembersSettingsPage() {
  const members = await getOrganizationMembers();

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header>
        <p className="text-sm font-semibold text-primary">{fr.settings.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
          {fr.settings.membersTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{fr.settings.membersDescription}</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{fr.settings.membersTitle}</CardTitle>
            <CardDescription>{fr.settings.activeMemberCount(members.length)}</CardDescription>
          </div>
          <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
            <UsersRound className="size-5" aria-hidden="true" />
          </span>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">{fr.settings.membersDescription}</caption>
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-3 py-3 font-semibold">
                      {fr.settings.member}
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      {fr.settings.email}
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      {fr.settings.role}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-4 font-semibold">{member.fullName ?? member.email}</td>
                      <td className="px-3 py-4 text-muted-foreground">{member.email}</td>
                      <td className="px-3 py-4">
                        <Badge>{fr.roles[member.role]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              {fr.settings.noMembers}
            </p>
          )}
        </CardContent>
      </Card>

      <Link
        href="/settings/organization"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {fr.settings.organizationLink}
      </Link>
    </div>
  );
}
