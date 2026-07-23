import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { classifyInboundMessage } from "@/features/inbox/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

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
    return apiErrorResponse(error, {
      invalidMessage: "La classification demandée est invalide.",
      failureMessage: "La classification n’a pas été modifiée. Réessayez depuis la conversation.",
    });
  }
}
