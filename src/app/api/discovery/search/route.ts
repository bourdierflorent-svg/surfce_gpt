import { NextResponse } from "next/server";

import { discoverySearchSchema } from "@/features/discovery/schemas";
import { searchDiscovery } from "@/features/discovery/server/service";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";

import { discoveryError, invalidPayload } from "../route-utils";

export async function POST(request: Request) {
  const parsed = discoverySearchSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(await searchDiscovery(context, parsed.data));
  } catch (error) {
    return discoveryError(error);
  }
}
