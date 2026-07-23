import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { classifyInboundMessage } from "@/features/inbox/server/service";

interface MessageRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: MessageRouteProps) {
  try {
    const context = await requireAppAuthContext();
    const messageId = z
      .string()
      .uuid()
      .parse((await params).id);
    return NextResponse.json(
      await classifyInboundMessage(context, messageId, await request.json()),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Classification impossible." },
      { status: 400 },
    );
  }
}
