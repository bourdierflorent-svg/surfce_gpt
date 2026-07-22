import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { personaRequestSchema } from "@/features/enrichment/schemas";
import { generateCompanyPersona, validateCompanyPersona } from "@/features/personas/server/service";

import { companyActionError, invalidCompanyAction } from "../../route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = personaRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCompanyAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    if (parsed.data.action === "validate") {
      return NextResponse.json(await validateCompanyPersona(context, id, parsed.data.personaId));
    }
    return NextResponse.json(await generateCompanyPersona(context, id, parsed.data.idempotencyKey));
  } catch (error) {
    return companyActionError(error);
  }
}
