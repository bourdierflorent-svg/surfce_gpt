import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { apiErrorResponse } from "@/lib/http/api-errors";

export function invalidPayload(error: ZodError) {
  return NextResponse.json(
    { error: "Les paramètres transmis sont invalides.", issues: error.issues },
    { status: 400 },
  );
}

export function discoveryError(error: unknown) {
  return apiErrorResponse(error, {
    failureMessage:
      "La recherche ou l’import n’a pas été confirmé. Modifiez les critères ou réessayez.",
  });
}
