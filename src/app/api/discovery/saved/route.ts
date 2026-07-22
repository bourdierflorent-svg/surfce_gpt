import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { savedSearchSchema } from "@/features/discovery/schemas";
import { saveDiscoverySearch } from "@/features/discovery/server/service";

import { discoveryError, invalidPayload } from "../route-utils";

export async function POST(request: Request) {
  const parsed = savedSearchSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  try {
    const context = await requireAppAuthContext();
    const id = await saveDiscoverySearch(
      context,
      parsed.data.name,
      parsed.data.search,
      parsed.data.resultCount,
    );
    return NextResponse.json({ id });
  } catch (error) {
    return discoveryError(error);
  }
}
