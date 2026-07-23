import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { AuthorizationError } from "@/lib/errors/authorization-error";

export function invalidCampaignAction(error: ZodError) {
  return NextResponse.json(
    { error: "L’action de campagne est invalide.", issues: error.issues },
    { status: 400 },
  );
}

export function campaignActionError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: "Votre rôle ne permet pas cette action." }, { status: 403 });
  }
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Le traitement n’a pas abouti.",
      safeToRetry: true,
    },
    { status: 500 },
  );
}
