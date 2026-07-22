import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { discoveryImportSchema } from "@/features/discovery/schemas";
import { importDiscoveryCandidate } from "@/features/discovery/server/service";

import { discoveryError, invalidPayload } from "../route-utils";

export async function POST(request: Request) {
  const parsed = discoveryImportSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(await importDiscoveryCandidate(context, parsed.data.externalId));
  } catch (error) {
    return discoveryError(error);
  }
}
