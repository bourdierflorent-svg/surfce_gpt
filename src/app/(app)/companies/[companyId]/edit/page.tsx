import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { CompanyForm } from "@/features/companies/components/company-form";
import { getCompanyDetail, listAssignableMembers } from "@/features/companies/server/queries";
import { can } from "@/lib/permissions/roles";

interface EditCompanyPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const context = await requireAppAuthContext();
  const { companyId } = await params;
  const [company, members] = await Promise.all([
    getCompanyDetail(context, companyId),
    listAssignableMembers(context),
  ]);
  if (!company) notFound();
  if (
    !can(context.membership.role, "companies:write") ||
    (context.membership.role === "sales" && company.assigned_to !== context.user.id)
  )
    redirect(`/companies/${companyId}`);

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="border-b border-border pb-7">
        <Link
          href={`/companies/${company.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour à la fiche
        </Link>
        <p className="font-data mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Qualification manuelle · Tracée
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Modifier {company.trade_name ?? company.legal_name}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Chaque enregistrement ajoute une source manuelle avec l’auteur et la date de vérification.
        </p>
      </header>
      <CompanyForm company={company} members={members} disabled={context.isPreview} />
    </div>
  );
}
