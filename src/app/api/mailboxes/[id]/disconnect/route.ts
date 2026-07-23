import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { mailboxIdSchema } from "@/features/mailboxes/schemas";
import { disconnectMailbox } from "@/features/mailboxes/server/service";

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Déconnexion impossible." },
      { status: 400 },
    );
  }
}
