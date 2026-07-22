import {
  AlertTriangle,
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleDot,
  Database,
  FileJson2,
  Fingerprint,
  MapPin,
  Pencil,
  Phone,
  Radar,
  ShieldAlert,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { getCompanyDetail } from "@/features/companies/server/queries";
import { COMPANY_STATUS_LABELS, type CompanyDetail } from "@/features/companies/types";
import { IntelligenceActionButton } from "@/features/enrichment/components/intelligence-action-button";
import { personaOutputSchema, type PersonaOutput } from "@/features/personas/schemas";
import { can } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database";

interface CompanyPageProps {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

type CompanyTab = "overview" | "persona" | "recommendations" | "sources";

const tabs: Array<{ id: CompanyTab; label: string }> = [
  { id: "overview", label: "Vue générale" },
  { id: "persona", label: "Persona" },
  { id: "recommendations", label: "Recommandations" },
  { id: "sources", label: "Données et sources" },
];

const breakdownLabels: Record<string, { label: string; max: number }> = {
  event_fit: { label: "Format", max: 30 },
  capacity_budget_fit: { label: "Jauge & budget", max: 20 },
  distance_fit: { label: "Proximité", max: 15 },
  brand_fit: { label: "Image", max: 15 },
  availability_fit: { label: "Disponibilité", max: 10 },
  history_fit: { label: "Historique", max: 10 },
};

function dateLabel(value: string | null): string {
  if (!value) return "Non vérifié";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function currencyLabel(value: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function stringList(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function recordValue(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readPersona(company: CompanyDetail): PersonaOutput | null {
  const row = company.latestPersona;
  if (!row) return null;
  const parsed = personaOutputSchema.safeParse({
    company_type: row.company_type,
    summary: row.summary,
    estimated_size: row.estimated_size,
    event_maturity: { level: row.event_maturity, confidence: row.confidence },
    probable_needs: row.probable_needs,
    likely_contact_roles: row.likely_contact_roles,
    recommended_event_types: row.recommended_event_types,
    estimated_guest_range: row.estimated_guest_range,
    estimated_budget_range: row.estimated_budget_range,
    fit_score: row.fit_score,
    confidence: row.confidence,
    risks: row.risks,
    evidence: row.evidence,
  });
  return parsed.success ? parsed.data : null;
}

function IntelligencePipeline({ company, canRun }: { company: CompanyDetail; canRun: boolean }) {
  const steps = [
    {
      index: "01",
      title: "Registre",
      description: "Confirmer sans inventer",
      action: "verify" as const,
      label: "Vérifier",
    },
    {
      index: "02",
      title: "Signaux web",
      description: "Analyse locale simulée",
      action: "enrich" as const,
      label: "Enrichir",
    },
    {
      index: "03",
      title: "Hypothèse",
      description: "JSON sourcé et versionné",
      action: "persona-generate" as const,
      label: company.latestPersona ? "Régénérer" : "Générer",
    },
    {
      index: "04",
      title: "Décision",
      description: "Lieu + offre expliqués",
      action: "matching-generate" as const,
      label: company.matches.length ? "Recalculer" : "Matcher",
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-[#102a43] text-white">
      <div className="grid xl:grid-cols-[17rem_1fr]">
        <header className="border-b border-white/10 p-6 xl:border-b-0 xl:border-r">
          <p className="font-data text-[0.62rem] uppercase tracking-[0.18em] text-white/50">
            Dossier d’hypothèses
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.04em]">
            De la preuve à l’offre
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Chaque étape est traçable, rejouable et sans coût externe dans ce mode.
          </p>
        </header>
        <ol className="grid sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.index}
              className={cn(
                "relative p-5 sm:p-6",
                index < steps.length - 1 && "border-b border-white/10 xl:border-b-0 xl:border-r",
                index === 1 && "sm:border-b-0 sm:border-r-0 xl:border-r",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-data text-[0.62rem] tracking-[0.18em] text-white/35">
                  {step.index}
                </span>
                <span className="rounded-full border border-white/15 px-2 py-1 font-data text-[0.58rem] uppercase tracking-[0.12em] text-white/55">
                  0&nbsp;€ mock
                </span>
              </div>
              <h3 className="mt-8 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 min-h-10 text-xs leading-5 text-white/55">{step.description}</p>
              <IntelligenceActionButton
                companyId={company.id}
                action={step.action}
                label={step.label}
                disabled={
                  !canRun || (step.action === "matching-generate" && !company.latestPersona)
                }
                className="mt-4 [&_button]:border-white/20 [&_button]:bg-white/8 [&_button]:text-white [&_button]:hover:bg-white/15"
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function OverviewTab({ company }: { company: CompanyDetail }) {
  const contactRows = [
    { icon: Phone, label: "Téléphone", value: company.phone ?? "Non disponible" },
    { icon: AtSign, label: "E-mail", value: company.generic_email ?? "Non disponible" },
    { icon: Users, label: "Effectif", value: company.employee_range ?? "À estimer" },
    {
      icon: UserRound,
      label: "Responsable",
      value: company.assignedUser?.fullName ?? company.assignedUser?.email ?? "Non attribuée",
    },
  ];

  return (
    <div className="space-y-6">
      <section
        aria-label="Synthèse"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        {contactRows.map(({ icon: Icon, label, value }, index) => (
          <div
            key={label}
            className={cn("p-5", index < 3 && "border-b border-border sm:border-r xl:border-b-0")}
          >
            <Icon className="size-4 text-primary" aria-hidden="true" />
            <p className="font-data mt-4 text-[0.62rem] uppercase tracking-[0.13em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 break-words text-sm font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {company.do_not_contact ? (
        <section className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 p-5">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-danger">Entreprise à ne pas contacter</h2>
            <p className="mt-1 text-sm text-muted-foreground">{company.do_not_contact_reason}</p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold tracking-[-0.03em]">Identité</h2>
          <dl className="mt-5 divide-y divide-border text-sm">
            {[
              ["Raison sociale", company.legal_name],
              ["SIREN", company.siren ?? "Non vérifié"],
              ["SIRET principal", company.primary_siret ?? "Non vérifié"],
              ["Activité", company.subsector ?? company.sector ?? "À qualifier"],
              [
                "Adresse",
                [company.address_line1, company.postal_code, company.city]
                  .filter(Boolean)
                  .join(", "),
              ],
              ["Domaine", company.domain ?? "Non disponible"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-border pt-5">
            <p className="font-data text-[0.62rem] uppercase tracking-[0.13em] text-muted-foreground">
              Tags
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {company.tags.length ? (
                company.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)
              ) : (
                <span className="text-sm text-muted-foreground">Aucun tag</span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-primary" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em]">Implantations</h2>
          </div>
          {company.locations.length ? (
            <div className="mt-5 space-y-3">
              {company.locations.map((location) => (
                <article key={location.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{location.label}</p>
                    {location.is_headquarters ? <Badge>Siège</Badge> : null}
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {[location.address_line1, location.postal_code, location.city]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune implantation secondaire confirmée.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function PersonaTab({ company, canRun }: { company: CompanyDetail; canRun: boolean }) {
  const persona = readPersona(company);
  const row = company.latestPersona;
  if (!persona || !row) {
    return (
      <section className="grid min-h-80 place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <div className="max-w-md">
          <FileJson2 className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h2 className="font-display mt-4 text-2xl font-semibold tracking-[-0.04em]">
            Aucune hypothèse structurée
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Générez un persona mock à partir des seules données et sources disponibles. Les
            inconnues resteront nulles.
          </p>
          <IntelligenceActionButton
            companyId={company.id}
            action="persona-generate"
            label="Générer le persona"
            disabled={!canRun}
            variant="primary"
            className="mt-5"
          />
        </div>
      </section>
    );
  }

  const maturityLabels = {
    low: "Faible",
    medium: "Intermédiaire",
    high: "Élevée",
    unknown: "Inconnue",
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="grid gap-5 border-b border-border p-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-success/20 bg-success/10 text-success">
                  <FileJson2 className="mr-1 size-3" aria-hidden="true" />
                  JSON validé
                </Badge>
                <Badge>Version {row.version}</Badge>
                <Badge
                  className={
                    row.status === "validated"
                      ? "border-success/20 bg-success/10 text-success"
                      : "border-warning/25 bg-warning/10 text-foreground"
                  }
                >
                  {row.status === "validated" ? "Validé humainement" : "Brouillon à valider"}
                </Badge>
              </div>
              <h2 className="font-display mt-5 text-3xl font-semibold tracking-[-0.05em]">
                {persona.company_type ?? "Type d’entreprise inconnu"}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {persona.summary}
              </p>
            </div>
            {row.status !== "validated" ? (
              <IntelligenceActionButton
                companyId={company.id}
                action="persona-validate"
                resourceId={row.id}
                label="Valider ce persona"
                disabled={!canRun}
                variant="primary"
              />
            ) : (
              <CheckCircle2 className="size-7 text-success" aria-label="Persona validé" />
            )}
          </header>
          <div className="grid md:grid-cols-3">
            <div className="border-b border-border p-5 md:border-b-0 md:border-r">
              <p className="font-data text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                Taille estimée
              </p>
              <p className="mt-2 text-sm font-semibold">
                {persona.estimated_size.label ?? "Inconnue"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Confiance {Math.round(persona.estimated_size.confidence * 100)} %
              </p>
            </div>
            <div className="border-b border-border p-5 md:border-b-0 md:border-r">
              <p className="font-data text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                Maturité événementielle
              </p>
              <p className="mt-2 text-sm font-semibold">
                {maturityLabels[persona.event_maturity.level]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Hypothèse, jamais un fait</p>
            </div>
            <div className="p-5">
              <p className="font-data text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                Invités estimés
              </p>
              <p className="mt-2 text-sm font-semibold">
                {persona.estimated_guest_range.min === null ||
                persona.estimated_guest_range.max === null
                  ? "Inconnus"
                  : `${persona.estimated_guest_range.min}–${persona.estimated_guest_range.max}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Budget : non estimé</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <p className="font-data text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-primary">
            Trace de raisonnement
          </p>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.03em]">
            Besoins probables, pas promesses
          </h2>
          <div className="mt-6 space-y-0 border-l border-primary/25 pl-5">
            {persona.probable_needs.map((need, index) => (
              <article key={`${need.type}-${index}`} className="relative pb-6 last:pb-0">
                <CircleDot
                  className="absolute -left-[1.73rem] top-0.5 size-3.5 bg-card text-primary"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold capitalize">{need.type}</h3>
                  <span className="font-data text-xs tabular-nums">
                    {Math.round(need.confidence * 100)} %
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{need.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Fingerprint className="size-4 text-primary" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em]">
              Preuves citées
            </h2>
          </div>
          {persona.evidence.length ? (
            <div className="mt-5 divide-y divide-border border-y border-border">
              {persona.evidence.map((evidence, index) => (
                <article
                  key={`${evidence.source_reference}-${index}`}
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">{evidence.claim}</p>
                    <p className="mt-1 font-data text-[0.62rem] text-muted-foreground">
                      SOURCE · {evidence.source_reference}
                    </p>
                  </div>
                  <Badge>{Math.round(evidence.confidence * 100)} %</Badge>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune preuve suffisante : le persona conserve une confiance faible.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="font-data text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
            Fit événementiel
          </p>
          <div className="mt-5 flex items-end gap-2">
            <span className="font-display text-6xl font-semibold tracking-[-0.08em]">
              {persona.fit_score}
            </span>
            <span className="mb-2 text-sm text-muted-foreground">/ 100</span>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${persona.fit_score}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Confiance globale {Math.round(persona.confidence * 100)} %. Le score aide à prioriser,
            il ne valide pas un besoin.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="font-data text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
            Formats à tester
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {persona.recommended_event_types.map((type) => (
              <Badge key={type}>{type}</Badge>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-warning/25 bg-warning/5 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
            <p className="text-sm font-semibold">Incertitudes</p>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            {persona.risks.map((risk) => (
              <li key={risk}>— {risk}</li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function RecommendationsTab({ company, canRun }: { company: CompanyDetail; canRun: boolean }) {
  if (!company.matches.length) {
    return (
      <section className="grid min-h-80 place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <div className="max-w-md">
          <Radar className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h2 className="font-display mt-4 text-2xl font-semibold tracking-[-0.04em]">
            Aucune recommandation calculée
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Le moteur compare le dernier persona aux offres actives. Les incompatibilités de jauge
            restent bloquantes.
          </p>
          <IntelligenceActionButton
            companyId={company.id}
            action="matching-generate"
            label="Calculer les recommandations"
            disabled={!canRun || !company.latestPersona}
            variant="primary"
            className="mt-5"
          />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="font-data text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-primary">
            Moteur déterministe v1
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.04em]">
            {company.matches.length} couples lieu + offre expliqués
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Les règles fixent le score. Le mock IA reformule uniquement la justification.
          </p>
        </div>
        <IntelligenceActionButton
          companyId={company.id}
          action="matching-generate"
          label="Recalculer"
          disabled={!canRun}
        />
      </header>
      {company.matches.map((match, index) => {
        const breakdown = recordValue(match.score_breakdown);
        return (
          <article
            key={match.id}
            className={cn(
              "overflow-hidden rounded-xl border bg-card",
              match.is_selected
                ? "border-primary shadow-[0_0_0_1px_var(--primary)]"
                : "border-border",
            )}
          >
            <div className="grid lg:grid-cols-[8rem_1fr_22rem]">
              <div
                className={cn(
                  "flex flex-row items-center justify-between border-b p-5 lg:flex-col lg:items-start lg:border-b-0 lg:border-r",
                  match.is_selected
                    ? "border-primary/20 bg-primary text-primary-foreground"
                    : "border-border bg-muted/35",
                )}
              >
                <span className="font-data text-[0.62rem] uppercase tracking-[0.14em] opacity-60">
                  Rang {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="font-display text-4xl font-semibold">{match.score}</span>
                  <span className="text-xs opacity-60"> /100</span>
                </div>
                {match.is_selected ? (
                  <BadgeCheck className="size-5" aria-label="Recommandation retenue" />
                ) : null}
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{match.venueType}</Badge>
                  {match.eventType ? <Badge>{match.eventType}</Badge> : null}
                  {match.is_selected ? (
                    <Badge className="border-success/20 bg-success/10 text-success">Retenue</Badge>
                  ) : null}
                </div>
                <h3 className="font-display mt-4 text-2xl font-semibold tracking-[-0.04em]">
                  {match.venueName}
                </h3>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {match.offerName ?? "Offre à préciser"}
                </p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {match.recommended_pitch}
                </p>
                <div className="mt-5 space-y-2">
                  {stringList(match.reasons).map((reason) => (
                    <p key={reason} className="flex gap-2 text-sm">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/venues/${match.venue_id}`}
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    Voir le lieu
                  </Link>
                  {!match.is_selected ? (
                    <IntelligenceActionButton
                      companyId={company.id}
                      action="matching-select"
                      resourceId={match.id}
                      label="Retenir cette piste"
                      disabled={!canRun}
                      variant="primary"
                    />
                  ) : null}
                </div>
              </div>
              <aside className="border-t border-border bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <p className="font-data text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Décomposition du score
                </p>
                <div className="mt-5 space-y-4">
                  {Object.entries(breakdownLabels).map(([key, meta]) => {
                    const value = typeof breakdown[key] === "number" ? Number(breakdown[key]) : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between gap-3 text-xs">
                          <span>{meta.label}</span>
                          <span className="font-data tabular-nums">
                            {value}/{meta.max}
                          </span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, (value / meta.max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {stringList(match.risks).length ? (
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-xs font-semibold">Points à confirmer</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                      {stringList(match.risks).map((risk) => (
                        <li key={risk}>— {risk}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </aside>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SourcesTab({ company }: { company: CompanyDetail }) {
  const statusLabels = {
    pending: "En attente",
    processing: "En cours",
    completed: "Terminé",
    failed: "Échec",
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="border-b border-border bg-muted/35 p-5 sm:p-6">
          <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
            Traçabilité par champ
          </p>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.03em]">
            Données et sources
          </h2>
        </header>
        {company.sources.length ? (
          <div className="divide-y divide-border">
            {company.sources.map((source) => (
              <article
                key={source.id}
                className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Database className="size-3.5 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold">{source.field_name}</p>
                    <Badge>{source.provider}</Badge>
                    {source.is_inferred ? (
                      <Badge className="border-warning/25 bg-warning/10 text-foreground">
                        Déduite
                      </Badge>
                    ) : (
                      <Badge className="border-success/20 bg-success/10 text-success">
                        Déclarée
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Collectée le {dateLabel(source.collected_at)} · réf.{" "}
                    {source.external_reference ?? "interne"}
                  </p>
                </div>
                <p className="font-data text-xs font-semibold tabular-nums">
                  {Math.round(source.confidence * 100)} %
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-48 place-items-center p-6 text-center">
            <div>
              <Database className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Aucune source enregistrée</p>
            </div>
          </div>
        )}
      </section>
      <aside className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Journal des traitements</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Clés idempotentes, coût estimé et erreurs conservées sans secret.
        </p>
        {company.recentJobs.length ? (
          <ol className="mt-5 space-y-4 border-l border-border pl-4">
            {company.recentJobs.map((job) => (
              <li key={job.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[1.28rem] top-1 size-2 rounded-full ring-4 ring-card",
                    job.status === "completed"
                      ? "bg-success"
                      : job.status === "failed"
                        ? "bg-danger"
                        : "bg-warning",
                  )}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 break-words text-xs font-semibold">
                    {job.job_type.replaceAll("_", " ")}
                  </p>
                  <span className="font-data text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
                    {statusLabels[job.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {job.provider} · {currencyLabel(Number(job.estimated_cost), job.currency)}
                </p>
                <p className="mt-1 text-[0.68rem] text-muted-foreground">
                  {dateLabel(job.created_at)}
                </p>
                {job.error ? (
                  <p className="mt-2 break-words text-xs text-danger">{job.error}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">Aucun traitement lancé.</p>
        )}
      </aside>
    </div>
  );
}

export default async function CompanyPage({ params, searchParams }: CompanyPageProps) {
  const context = await requireAppAuthContext();
  const [{ companyId }, query] = await Promise.all([params, searchParams]);
  const company = await getCompanyDetail(context, companyId);
  if (!company) notFound();
  const activeTab = tabs.some((tab) => tab.id === query.tab)
    ? (query.tab as CompanyTab)
    : "overview";
  const canRun =
    can(context.membership.role, "intelligence:run") &&
    !context.isPreview &&
    (context.membership.role !== "sales" || company.assigned_to === context.user.id);
  const name = company.trade_name ?? company.legal_name;

  return (
    <div className="mx-auto max-w-[90rem] space-y-7">
      <header className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid lg:grid-cols-[1fr_21rem]">
          <div className="p-6 sm:p-8 lg:p-10">
            <Link
              href="/companies"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Registre entreprises
            </Link>
            <div className="mt-9 flex flex-wrap items-center gap-2">
              <Badge>{COMPANY_STATUS_LABELS[company.status]}</Badge>
              {company.do_not_contact ? (
                <Badge className="border-danger/25 bg-danger/10 text-danger">Opposition</Badge>
              ) : null}
              {company.latestPersona ? (
                <Badge className="border-accent/25 bg-accent/10 text-accent-foreground">
                  Persona v{company.latestPersona.version}
                </Badge>
              ) : null}
              <span className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                {company.sector ?? "Secteur à qualifier"}
              </span>
            </div>
            <h1 className="font-display mt-4 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
              {name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              {company.description ?? "Description à compléter à partir d’une source vérifiable."}
            </p>
            {canRun ? (
              <Link href={`/companies/${company.id}/edit`} className={cn(buttonVariants(), "mt-7")}>
                <Pencil className="size-4" aria-hidden="true" />
                Modifier la fiche
              </Link>
            ) : null}
          </div>
          <aside className="relative overflow-hidden bg-[#102a43] p-7 text-white">
            <div
              className="absolute -right-20 -top-20 size-60 rounded-full border border-white/10"
              aria-hidden="true"
            />
            <p className="font-data text-[0.65rem] uppercase tracking-[0.18em] text-white/55">
              Signal commercial
            </p>
            <div className="mt-10 grid size-36 place-items-center rounded-full border border-white/25">
              <div className="grid size-24 place-items-center rounded-full border border-white/15">
                <span className="font-display text-4xl font-semibold">
                  {company.latestPersona?.fit_score ?? company.qualification_score ?? "—"}
                </span>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold">Fit / 100</p>
            <div className="mt-7 h-px bg-white/15" />
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-data text-[0.6rem] uppercase tracking-[0.14em] text-white/45">
                  Confiance des données
                </dt>
                <dd className="mt-1 font-semibold">{company.data_quality_score ?? "—"} / 100</dd>
              </div>
              <div>
                <dt className="font-data text-[0.6rem] uppercase tracking-[0.14em] text-white/45">
                  Dernière vérification
                </dt>
                <dd className="mt-1 font-semibold">{dateLabel(company.last_verified_at)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <IntelligencePipeline company={company} canRun={canRun} />

      <nav
        aria-label="Sections de la fiche"
        className="flex gap-1 overflow-x-auto border-b border-border pb-2"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={
              tab.id === "overview"
                ? `/companies/${company.id}`
                : `/companies/${company.id}?tab=${tab.id}`
            }
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
        {["Contacts · P5", "Conversations · P6", "Opportunités · P7"].map((label) => (
          <span
            key={label}
            aria-disabled="true"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground/55"
          >
            {label}
          </span>
        ))}
      </nav>

      {activeTab === "overview" ? <OverviewTab company={company} /> : null}
      {activeTab === "persona" ? <PersonaTab company={company} canRun={canRun} /> : null}
      {activeTab === "recommendations" ? (
        <RecommendationsTab company={company} canRun={canRun} />
      ) : null}
      {activeTab === "sources" ? <SourcesTab company={company} /> : null}
    </div>
  );
}
