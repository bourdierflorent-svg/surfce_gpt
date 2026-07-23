import { NextResponse } from "next/server";

import { complianceActionError, invalidComplianceRequest } from "@/app/api/compliance/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { complianceSettingsSchema } from "@/features/compliance/schemas";
import { updateComplianceSettings } from "@/features/compliance/server/service";

export async function PATCH(request: Request) {
  try {
    const parsed = complianceSettingsSchema.safeParse(await request.json());
    if (!parsed.success) return invalidComplianceRequest(parsed.error);
    const context = await requireAppAuthContext();
    return NextResponse.json(await updateComplianceSettings(context, parsed.data));
  } catch (error) {
    return complianceActionError(error);
  }
}
