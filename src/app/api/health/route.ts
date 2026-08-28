export const dynamic = "force-dynamic";

export async function GET() {
  const liveInventoryConfigured = Boolean(
    process.env.TRAILTRIX_INVENTORY_URL && process.env.TRAILTRIX_API_KEY
  );

  return Response.json(
    {
      status: "ok",
      service: "commonground-travel",
      version: process.env.COMMONGROUND_RELEASE ?? "1.0.0",
      inventoryMode: liveInventoryConfigured ? "trailtrix" : "seed",
      webmcp: {
        toolCount: 14,
        humanApprovalRequired: true,
        autonomousPurchase: false,
        originTrialConfigured: Boolean(process.env.WEBMCP_ORIGIN_TRIAL_TOKEN),
      },
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    }
  );
}
