import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { threadIdSchema } from "@/features/inbox/schemas";
import { markThreadRead } from "@/features/inbox/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

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
    return apiErrorResponse(error, {
      invalidMessage: "La conversation demandée est invalide.",
      failureMessage: "L’état de lecture n’a pas été modifié. Rechargez la conversation.",
    });
  }
}
