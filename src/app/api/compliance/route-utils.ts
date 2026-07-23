import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { apiErrorResponse } from "@/lib/http/api-errors";

export function invalidComplianceRequest(error: ZodError) {
  return NextResponse.json(
    { error: "La demande de conformité est invalide.", issues: error.issues },
    { status: 400 },
  );
}

export function complianceActionError(error: unknown) {
  return apiErrorResponse(error, {
    failureMessage:
      "L’action de conformité n’a pas été confirmée. Aucune suppression ne doit être supposée.",
  });
}
