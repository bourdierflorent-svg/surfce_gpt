"use client";

import { useActionState, useEffect } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyRow } from "@/types/database";

import { updateCompanyAction, type CompanyActionState } from "../server/actions";
import { COMPANY_STATUS_LABELS, type AssignableMember } from "../types";

const initialState: CompanyActionState = { success: false, message: "" };

function errorFor(state: CompanyActionState, field: string): string | undefined {
  return state.fieldErrors?.[field]?.[0];
}

export function CompanyForm({
  company,
  members,
  disabled = false,
}: {
  company: CompanyRow;
  members: AssignableMember[];
  disabled?: boolean;
}) {
  const action = updateCompanyAction.bind(null, company.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    const firstInvalidField = Object.keys(state.fieldErrors ?? {})[0];
    if (firstInvalidField) document.getElementById(firstInvalidField)?.focus();
  }, [state.fieldErrors]);

  return (
    <form action={formAction} className="space-y-7" autoComplete="off">
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
          Identité vérifiable
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <FormField
            htmlFor="legal_name"
            label="Raison sociale"
            error={errorFor(state, "legal_name")}
          >
            <Input
              id="legal_name"
              name="legal_name"
              defaultValue={company.legal_name}
              disabled={disabled}
              required
            />
          </FormField>
          <FormField
            htmlFor="trade_name"
            label="Nom commercial"
            optional
            error={errorFor(state, "trade_name")}
          >
            <Input
              id="trade_name"
              name="trade_name"
              defaultValue={company.trade_name ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField htmlFor="siren" label="SIREN" optional error={errorFor(state, "siren")}>
            <Input
              id="siren"
              name="siren"
              inputMode="numeric"
              defaultValue={company.siren ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="primary_siret"
            label="SIRET principal"
            optional
            error={errorFor(state, "primary_siret")}
          >
            <Input
              id="primary_siret"
              name="primary_siret"
              inputMode="numeric"
              defaultValue={company.primary_siret ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="legal_form"
            label="Forme juridique"
            optional
            error={errorFor(state, "legal_form")}
          >
            <Input
              id="legal_form"
              name="legal_form"
              defaultValue={company.legal_form ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="activity_code"
            label="Code d’activité"
            optional
            error={errorFor(state, "activity_code")}
          >
            <Input
              id="activity_code"
              name="activity_code"
              defaultValue={company.activity_code ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField htmlFor="sector" label="Secteur" optional error={errorFor(state, "sector")}>
            <Input
              id="sector"
              name="sector"
              defaultValue={company.sector ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="subsector"
            label="Sous-secteur"
            optional
            error={errorFor(state, "subsector")}
          >
            <Input
              id="subsector"
              name="subsector"
              defaultValue={company.subsector ?? ""}
              disabled={disabled}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField
              htmlFor="description"
              label="Description"
              optional
              error={errorFor(state, "description")}
            >
              <Textarea
                id="description"
                name="description"
                defaultValue={company.description ?? ""}
                disabled={disabled}
              />
            </FormField>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
          Coordonnées et présence
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <FormField
            htmlFor="website_url"
            label="Site internet"
            optional
            error={errorFor(state, "website_url")}
          >
            <Input
              id="website_url"
              name="website_url"
              type="url"
              defaultValue={company.website_url ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField htmlFor="domain" label="Domaine" optional error={errorFor(state, "domain")}>
            <Input
              id="domain"
              name="domain"
              defaultValue={company.domain ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField htmlFor="phone" label="Téléphone" optional error={errorFor(state, "phone")}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={company.phone ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="generic_email"
            label="E-mail générique"
            optional
            error={errorFor(state, "generic_email")}
          >
            <Input
              id="generic_email"
              name="generic_email"
              type="email"
              spellCheck={false}
              defaultValue={company.generic_email ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="address_line1"
            label="Adresse"
            optional
            error={errorFor(state, "address_line1")}
          >
            <Input
              id="address_line1"
              name="address_line1"
              defaultValue={company.address_line1 ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="address_line2"
            label="Complément"
            optional
            error={errorFor(state, "address_line2")}
          >
            <Input
              id="address_line2"
              name="address_line2"
              defaultValue={company.address_line2 ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="postal_code"
            label="Code postal"
            optional
            error={errorFor(state, "postal_code")}
          >
            <Input
              id="postal_code"
              name="postal_code"
              defaultValue={company.postal_code ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField htmlFor="city" label="Ville" error={errorFor(state, "city")}>
            <Input id="city" name="city" defaultValue={company.city} disabled={disabled} required />
          </FormField>
          <FormField
            htmlFor="district"
            label="Arrondissement / zone"
            optional
            error={errorFor(state, "district")}
          >
            <Input
              id="district"
              name="district"
              defaultValue={company.district ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField htmlFor="country_code" label="Pays" error={errorFor(state, "country_code")}>
            <Input
              id="country_code"
              name="country_code"
              defaultValue={company.country_code}
              disabled={disabled}
              required
            />
          </FormField>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
          Qualification commerciale
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <FormField htmlFor="status" label="Statut" error={errorFor(state, "status")}>
            <Select id="status" name="status" defaultValue={company.status} disabled={disabled}>
              {Object.entries(COMPANY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            htmlFor="assigned_to"
            label="Responsable commercial"
            optional
            error={errorFor(state, "assigned_to")}
          >
            <Select
              id="assigned_to"
              name="assigned_to"
              defaultValue={company.assigned_to ?? ""}
              disabled={disabled}
            >
              <option value="">Non attribuée</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName ?? member.email}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            htmlFor="qualification_score"
            label="Score de potentiel"
            optional
            error={errorFor(state, "qualification_score")}
          >
            <Input
              id="qualification_score"
              name="qualification_score"
              type="number"
              min={0}
              max={100}
              defaultValue={company.qualification_score ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="data_quality_score"
            label="Qualité des données"
            optional
            error={errorFor(state, "data_quality_score")}
          >
            <Input
              id="data_quality_score"
              name="data_quality_score"
              type="number"
              min={0}
              max={100}
              defaultValue={company.data_quality_score ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="employee_range"
            label="Effectif estimé"
            optional
            error={errorFor(state, "employee_range")}
          >
            <Input
              id="employee_range"
              name="employee_range"
              defaultValue={company.employee_range ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField
            htmlFor="revenue_range"
            label="Tranche de chiffre d’affaires"
            optional
            error={errorFor(state, "revenue_range")}
          >
            <Input
              id="revenue_range"
              name="revenue_range"
              defaultValue={company.revenue_range ?? ""}
              disabled={disabled}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField
              htmlFor="tags"
              label="Tags"
              optional
              description="Séparez les tags par des virgules."
              error={errorFor(state, "tags")}
            >
              <Input
                id="tags"
                name="tags"
                defaultValue={company.tags.join(", ")}
                disabled={disabled}
              />
            </FormField>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-4 text-sm font-semibold md:col-span-2">
            <input
              name="do_not_contact"
              type="checkbox"
              defaultChecked={company.do_not_contact}
              disabled={disabled}
              className="size-4 accent-primary"
            />
            Ne pas contacter cette entreprise
          </label>
          <div className="md:col-span-2">
            <FormField
              htmlFor="do_not_contact_reason"
              label="Motif d’opposition"
              optional
              error={errorFor(state, "do_not_contact_reason")}
            >
              <Textarea
                id="do_not_contact_reason"
                name="do_not_contact_reason"
                defaultValue={company.do_not_contact_reason ?? ""}
                disabled={disabled}
              />
            </FormField>
          </div>
        </div>
      </section>

      {state.message ? (
        <p
          className={
            state.success
              ? "text-sm font-semibold text-success"
              : "text-sm font-semibold text-danger"
          }
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || pending}>
          {pending ? "Enregistrement…" : "Enregistrer la fiche"}
        </Button>
      </div>
    </form>
  );
}
