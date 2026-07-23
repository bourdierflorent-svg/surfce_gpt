import { z } from "zod";

import { complianceActionError, invalidComplianceRequest } from "@/app/api/compliance/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { contactAccessSchema } from "@/features/compliance/schemas";
import { exportContactSubject } from "@/features/compliance/server/service";

interface RouteContext {
  params: Promise<{ contactId: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { contactId } = await params;
    const reason = new URL(request.url).searchParams.get("reason") ?? undefined;
    const parsed = contactAccessSchema.safeParse({ contactId, reason });
    if (!parsed.success) return invalidComplianceRequest(parsed.error);
    const context = await requireAppAuthContext();
    const result = await exportContactSubject(context, parsed.data.contactId, parsed.data.reason);
    return new Response(result.body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${result.fileName}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return invalidComplianceRequest(error);
    return complianceActionError(error);
  }
}
