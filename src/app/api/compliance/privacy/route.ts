import { NextResponse } from "next/server";

import { complianceActionError, invalidComplianceRequest } from "@/app/api/compliance/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { privacyRequestSchema } from "@/features/compliance/schemas";
import { processPrivacyRequest } from "@/features/compliance/server/service";

export async function POST(request: Request) {
  try {
    const parsed = privacyRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidComplianceRequest(parsed.error);
    const context = await requireAppAuthContext();
    return NextResponse.json(await processPrivacyRequest(context, parsed.data), { status: 201 });
  } catch (error) {
    return complianceActionError(error);
  }
}
