import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { discoveryBatchImportSchema } from "@/features/discovery/schemas";
import { findDiscoveryDuplicates } from "@/features/discovery/server/service";

import { discoveryError, invalidPayload } from "../route-utils";

export async function POST(request: Request) {
  const parsed = discoveryBatchImportSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(await findDiscoveryDuplicates(context, parsed.data.externalIds));
  } catch (error) {
    return discoveryError(error);
  }
}
