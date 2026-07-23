import { readSupabasePublicConfig } from "@/lib/supabase/env";
import { hasSupabaseAdminCredentials } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function readiness() {
  const publicConfig = readSupabasePublicConfig();
  const ready = Boolean(publicConfig);
  return {
    ready,
    payload: {
      status: ready ? "ready" : "degraded",
      service: "surfce-web",
      timestamp: new Date().toISOString(),
      checks: {
        publicDatabaseConfiguration: publicConfig ? "ok" : "missing",
        serviceOperations: hasSupabaseAdminCredentials() ? "configured" : "closed",
        encryptedProviders: process.env.APP_ENCRYPTION_KEY ? "configured" : "closed",
        scheduledJobs: process.env.CRON_SECRET ? "configured" : "closed",
      },
    },
  };
}

export function GET() {
  const result = readiness();
  return Response.json(result.payload, {
    status: result.ready ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}

export function HEAD() {
  const result = readiness();
  return new Response(null, {
    status: result.ready ? 204 : 503,
    headers: { "cache-control": "no-store" },
  });
}
