import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { apiErrorResponse } from "@/lib/http/api-errors";

export function invalidCampaignAction(error: ZodError) {
  return NextResponse.json(
    { error: "L’action de campagne est invalide.", issues: error.issues },
    { status: 400 },
  );
}

export function campaignActionError(error: unknown) {
  return apiErrorResponse(error, {
    failureMessage:
      "L’action de campagne n’a pas été confirmée. Vérifiez son état avant de réessayer.",
  });
}
