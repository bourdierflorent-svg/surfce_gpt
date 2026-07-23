import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type { ContactRow } from "@/types/database";

import type { ContactDetail, ContactListItem } from "../types";

const previewContacts: ContactRow[] = [
  {
    id: "70000000-0000-0000-0000-000000000001",
    organization_id: "10000000-0000-0000-0000-000000000001",
    company_id: "50000000-0000-0000-0000-000000000001",
    first_name: "Lina",
    last_name: "Martin",
    full_name: "Lina Martin",
    job_title: "Responsable Communication",
    department: "Communication",
    email: "lina.martin@studio-huit.example",
    normalized_email: "lina.martin@studio-huit.example",
    email_status: "valid",
    phone: null,
    linkedin_url: null,
    contact_status: "valid",
    confidence: 0.97,
    lawful_basis: "intérêt légitime B2B documenté",
    do_not_contact: false,
    do_not_contact_reason: null,
    assigned_to: null,
    last_contacted_at: null,
    last_replied_at: null,
    tags: ["fictif", "communication"],
    created_at: "2026-07-23T08:00:00.000Z",
    updated_at: "2026-07-23T08:00:00.000Z",
    deleted_at: null,
  },
  {
    id: "70000000-0000-0000-0000-000000000002",
    organization_id: "10000000-0000-0000-0000-000000000001",
    company_id: "50000000-0000-0000-0000-000000000002",
    first_name: "Noé",
    last_name: "Bernard",
    full_name: "Noé Bernard",
    job_title: "Office Manager",
    department: "Opérations",
    email: "noe.bernard@rive-conseil.example",
    normalized_email: "noe.bernard@rive-conseil.example",
    email_status: "unverified",
    phone: null,
    linkedin_url: null,
    contact_status: "to_verify",
    confidence: 0.62,
    lawful_basis: null,
    do_not_contact: false,
    do_not_contact_reason: null,
    assigned_to: null,
    last_contacted_at: null,
    last_replied_at: null,
    tags: ["fictif", "office"],
    created_at: "2026-07-23T08:00:00.000Z",
    updated_at: "2026-07-23T08:00:00.000Z",
    deleted_at: null,
  },
];

export async function listContacts(
  context: AppAuthContext,
  options: { query?: string; status?: string } = {},
): Promise<ContactListItem[]> {
  if (context.isPreview) {
    const value = options.query?.trim().toLocaleLowerCase("fr") ?? "";
    return previewContacts
      .filter(
        (contact) =>
          (!value ||
            `${contact.full_name} ${contact.job_title} ${contact.email}`
              .toLocaleLowerCase("fr")
              .includes(value)) &&
          (!options.status ||
            options.status === "all" ||
            contact.contact_status === options.status),
      )
      .map((contact) => ({
        ...contact,
        companyName: contact.company_id.endsWith("1")
          ? "Studio Huit Communication"
          : "Cabinet Rive Conseil",
      }));
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", context.organization.id)
    .is("deleted_at", null)
    .order("do_not_contact")
    .order("full_name");
  if (options.query?.trim()) query = query.ilike("full_name", `%${options.query.trim()}%`);
  if (options.status && options.status !== "all") {
    query = query.eq("contact_status", options.status as ContactRow["contact_status"]);
  }
  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les contacts.");

  const companyIds = Array.from(new Set((data ?? []).map((contact) => contact.company_id)));
  const companies = companyIds.length
    ? await supabase
        .from("companies")
        .select("id, trade_name, legal_name")
        .eq("organization_id", context.organization.id)
        .in("id", companyIds)
    : { data: [], error: null };
  if (companies.error) throw new Error("Impossible de résoudre les entreprises des contacts.");
  const names = new Map(
    (companies.data ?? []).map((company) => [company.id, company.trade_name ?? company.legal_name]),
  );
  return (data ?? []).map((contact) => ({
    ...contact,
    companyName: names.get(contact.company_id) ?? "Entreprise indisponible",
  }));
}

export async function getContactDetail(
  context: AppAuthContext,
  contactId: string,
): Promise<ContactDetail | null> {
  if (context.isPreview) {
    const contact = previewContacts.find((item) => item.id === contactId);
    if (!contact) return null;
    return {
      ...contact,
      companyName: contact.company_id.endsWith("1")
        ? "Studio Huit Communication"
        : "Cabinet Rive Conseil",
      companyDomain: contact.company_id.endsWith("1")
        ? "studio-huit.example"
        : "rive-conseil.example",
      companyAssignedTo: null,
      latestVerification:
        contact.email_status === "valid"
          ? {
              provider: "mock_email_verification",
              checkedAt: contact.updated_at,
              confidence: contact.confidence,
              mock: true,
            }
          : null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger ce contact.");
  if (!contact) return null;

  const [companyResult, sourceResult] = await Promise.all([
    supabase
      .from("companies")
      .select("trade_name, legal_name, domain, assigned_to")
      .eq("organization_id", context.organization.id)
      .eq("id", contact.company_id)
      .maybeSingle(),
    supabase
      .from("data_sources")
      .select("provider, collected_at, confidence, metadata")
      .eq("organization_id", context.organization.id)
      .eq("entity_type", "contact")
      .eq("entity_id", contact.id)
      .eq("field_name", "email_verification")
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (companyResult.error || sourceResult.error || !companyResult.data) {
    throw new Error("Impossible de charger le contexte de ce contact.");
  }
  const metadata =
    sourceResult.data?.metadata &&
    typeof sourceResult.data.metadata === "object" &&
    !Array.isArray(sourceResult.data.metadata)
      ? sourceResult.data.metadata
      : {};
  return {
    ...contact,
    companyName: companyResult.data.trade_name ?? companyResult.data.legal_name,
    companyDomain: companyResult.data.domain,
    companyAssignedTo: companyResult.data.assigned_to,
    latestVerification: sourceResult.data
      ? {
          provider: sourceResult.data.provider,
          checkedAt: sourceResult.data.collected_at,
          confidence: Number(sourceResult.data.confidence),
          mock: metadata.mock === true,
        }
      : null,
  };
}
