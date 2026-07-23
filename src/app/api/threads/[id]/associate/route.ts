import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { threadIdSchema } from "@/features/inbox/schemas";
import { associateThread } from "@/features/inbox/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

interface ThreadRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: ThreadRouteProps) {
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await associateThread(context, threadIdSchema.parse((await params).id), await request.json()),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      invalidMessage: "L’association demandée est invalide.",
      failureMessage: "La conversation n’a pas été réassociée. Vérifiez les fiches sélectionnées.",
    });
  }
}
