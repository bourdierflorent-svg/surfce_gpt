import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { apiErrorResponse } from "@/lib/http/api-errors";

export function invalidCompanyAction(error: ZodError) {
  return NextResponse.json(
    { error: "L’action demandée est invalide.", issues: error.issues },
    { status: 400 },
  );
}

export function companyActionError(error: unknown) {
  return apiErrorResponse(error, {
    failureMessage:
      "Le traitement n’a pas abouti. Aucune nouvelle donnée n’a été confirmée ; réessayez.",
  });
}
