import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { threadIdSchema } from "@/features/inbox/schemas";
import { markThreadRead } from "@/features/inbox/server/service";

interface ThreadRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: ThreadRouteProps) {
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await markThreadRead(context, threadIdSchema.parse((await params).id)),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible." },
      { status: 400 },
    );
  }
}
