import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { mailboxIdSchema } from "@/features/mailboxes/schemas";
import { syncMailbox } from "@/features/mailboxes/server/service";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { apiErrorResponse } from "@/lib/http/api-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MailboxRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: MailboxRouteProps) {
  try {
    const context = await requireAppAuthContext();
    assertOrganizationPermission(context.membership.role, "mailboxes:write");
    const mailboxId = mailboxIdSchema.parse((await params).id);
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("mailboxes")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("id", mailboxId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Boîte introuvable." }, { status: 404 });
    return NextResponse.json(await syncMailbox(mailboxId));
  } catch (error) {
    return apiErrorResponse(error, {
      invalidMessage: "La boîte demandée est invalide.",
      failureMessage:
        "La synchronisation n’a pas été confirmée. Aucun message ne doit être considéré importé.",
    });
  }
}
