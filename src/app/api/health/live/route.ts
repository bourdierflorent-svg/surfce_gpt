export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "surfce-web",
      timestamp: new Date().toISOString(),
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export function HEAD() {
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
