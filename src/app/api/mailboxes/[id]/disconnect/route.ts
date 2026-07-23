import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { mailboxIdSchema } from "@/features/mailboxes/schemas";
import { disconnectMailbox } from "@/features/mailboxes/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

interface MailboxRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: MailboxRouteProps) {
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await disconnectMailbox(context, mailboxIdSchema.parse((await params).id)),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      invalidMessage: "La boîte demandée est invalide.",
      failureMessage:
        "La déconnexion n’a pas été confirmée. Considérez la boîte encore active et réessayez.",
    });
  }
}
