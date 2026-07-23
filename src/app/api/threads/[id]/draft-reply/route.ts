import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { threadIdSchema } from "@/features/inbox/schemas";
import { draftThreadReply } from "@/features/inbox/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

interface ThreadRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: ThreadRouteProps) {
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await draftThreadReply(context, threadIdSchema.parse((await params).id)),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      invalidMessage: "La conversation demandée est invalide.",
      failureMessage: "Aucune suggestion n’a été créée. Rédigez la réponse ou réessayez.",
    });
  }
}
