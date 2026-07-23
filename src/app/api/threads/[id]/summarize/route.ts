import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { threadIdSchema } from "@/features/inbox/schemas";
import { summarizeThread } from "@/features/inbox/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

interface ThreadRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: ThreadRouteProps) {
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await summarizeThread(context, threadIdSchema.parse((await params).id)),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      invalidMessage: "La conversation demandée est invalide.",
      failureMessage: "Le résumé n’a pas été créé. La conversation d’origine reste inchangée.",
    });
  }
}
