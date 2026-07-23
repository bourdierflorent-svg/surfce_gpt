import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { AuthorizationError } from "@/lib/errors/authorization-error";

export function invalidOpportunityAction(error: ZodError) {
  return NextResponse.json(
    { error: "Les données commerciales sont invalides.", issues: error.issues },
    { status: 400 },
  );
}

export function opportunityActionError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "L’action n’a pas abouti." },
    { status: 500 },
  );
}
