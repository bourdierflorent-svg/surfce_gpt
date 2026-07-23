import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { apiErrorResponse } from "@/lib/http/api-errors";

export function invalidOpportunityAction(error: ZodError) {
  return NextResponse.json(
    { error: "Les données commerciales sont invalides.", issues: error.issues },
    { status: 400 },
  );
}

export function opportunityActionError(error: unknown) {
  return apiErrorResponse(error, {
    failureMessage:
      "L’action commerciale n’a pas été confirmée. Vérifiez le dossier avant de réessayer.",
  });
}
