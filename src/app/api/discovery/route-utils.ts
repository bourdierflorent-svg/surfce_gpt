import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { AuthorizationError } from "@/lib/errors/authorization-error";

export function invalidPayload(error: ZodError) {
  return NextResponse.json(
    { error: "Les paramètres transmis sont invalides.", issues: error.issues },
    { status: 400 },
  );
}

export function discoveryError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: "Votre rôle ne permet pas cette action." }, { status: 403 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Une erreur inattendue est survenue." },
    { status: 500 },
  );
}
