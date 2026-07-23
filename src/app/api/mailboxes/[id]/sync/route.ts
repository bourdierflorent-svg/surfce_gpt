import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { mailboxIdSchema } from "@/features/mailboxes/schemas";
import { syncMailbox } from "@/features/mailboxes/server/service";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Synchronisation impossible." },
      { status: 400 },
    );
  }
}
