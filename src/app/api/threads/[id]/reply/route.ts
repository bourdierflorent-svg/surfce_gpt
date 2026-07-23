import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { threadIdSchema } from "@/features/inbox/schemas";
import { replyToThread } from "@/features/inbox/server/service";

interface ThreadRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: ThreadRouteProps) {
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await replyToThread(context, threadIdSchema.parse((await params).id), await request.json()),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Réponse impossible." },
      { status: 400 },
    );
  }
}
