import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { AuthorizationError } from "@/lib/errors/authorization-error";

export function invalidComplianceRequest(error: ZodError) {
  return NextResponse.json(
    { error: "La demande de conformité est invalide.", issues: error.issues },
    { status: 400 },
  );
}

export function complianceActionError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "L’action de conformité n’a pas abouti." },
    { status: 500 },
  );
}
