import { NextResponse } from "next/server";

import { complianceActionError } from "@/app/api/compliance/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { simulateRetention } from "@/features/compliance/server/service";

export async function POST() {
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(await simulateRetention(context), { status: 201 });
  } catch (error) {
    return complianceActionError(error);
  }
}
