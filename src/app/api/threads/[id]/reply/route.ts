import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { threadIdSchema } from "@/features/inbox/schemas";
import { replyToThread } from "@/features/inbox/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

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
    return apiErrorResponse(error, {
      invalidMessage: "La réponse demandée est invalide.",
      failureMessage:
        "Le provider n’a pas confirmé la réponse. Vérifiez le fil avant tout nouvel envoi.",
    });
  }
}
