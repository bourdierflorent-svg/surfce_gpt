import { z } from "zod";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const optionalScore = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), "Le score doit être un entier.")
  .refine(
    (value) => value === "" || (Number(value) >= 0 && Number(value) <= 100),
    "Le score doit être compris entre 0 et 100.",
  )
  .transform((value) => (value === "" ? null : Number(value)));

const tagList = z
  .string()
  .max(800)
  .transform((value) =>
    Array.from(
      new Set(
        value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ),
  );

export const companyFormSchema = z
  .object({
    legal_name: z.string().trim().min(2).max(180),
    trade_name: nullableText(180),
    siren: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{9}$/.test(value),
        "Le SIREN doit contenir 9 chiffres.",
      )
      .transform((value) => value || null),
    primary_siret: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{14}$/.test(value),
        "Le SIRET doit contenir 14 chiffres.",
      )
      .transform((value) => value || null),
    legal_form: nullableText(100),
    sector: nullableText(120),
    subsector: nullableText(120),
    activity_code: nullableText(20),
    description: nullableText(4000),
    website_url: nullableText(500),
    domain: nullableText(255),
    phone: nullableText(80),
    generic_email: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || z.email().safeParse(value).success,
        "L’e-mail est invalide.",
      )
      .transform((value) => value.toLowerCase() || null),
    employee_range: nullableText(80),
    revenue_range: nullableText(80),
    address_line1: nullableText(200),
    address_line2: nullableText(200),
    postal_code: nullableText(20),
    city: z.string().trim().min(2).max(100),
    country_code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    district: nullableText(120),
    status: z.enum([
      "discovered",
      "qualified",
      "contacted",
      "engaged",
      "opportunity",
      "customer",
      "disqualified",
    ]),
    qualification_score: optionalScore,
    data_quality_score: optionalScore,
    assigned_to: z
      .string()
      .uuid()
      .or(z.literal(""))
      .transform((value) => value || null),
    tags: tagList,
    do_not_contact: z.boolean(),
    do_not_contact_reason: nullableText(1000),
  })
  .superRefine((value, context) => {
    if (value.do_not_contact && !value.do_not_contact_reason) {
      context.addIssue({
        code: "custom",
        path: ["do_not_contact_reason"],
        message: "Indiquez la raison de l’opposition.",
      });
    }
  });

export type CompanyFormInput = z.input<typeof companyFormSchema>;
export type CompanyFormData = z.output<typeof companyFormSchema>;

export function normalizeCompanyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeDomain(value: string | null): string | null {
  if (!value) return null;
  return (
    value
      .toLocaleLowerCase("fr")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] || null
  );
}
